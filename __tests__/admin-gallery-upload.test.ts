import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  image: {
    create: vi.fn(),
  },
}));

const putStorageFileMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_URL: 'http://localhost:3000',
    MAX_IMAGE_SIZE_MB: 10,
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  },
}));
vi.mock('@/lib/storage/cloudinary', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/storage/cloudinary')>();
  return {
    ...actual,
    putStorageFile: putStorageFileMock,
  };
});
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed-secret') },
}));

import {
  processGalleryFile,
  processGalleryBatch,
  getOrCreateSystemUser,
  MAX_BATCH_FILES,
  type InputFile,
} from '../lib/admin/gallery-upload';

function makeFile(overrides: Partial<InputFile> = {}): InputFile {
  return {
    filename: 'reuni.jpg',
    mimeType: 'image/jpeg',
    bytes: Buffer.from('fake-jpeg-bytes'),
    ...overrides,
  };
}

describe('admin gallery upload (direct, no optimization)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
    putStorageFileMock.mockResolvedValue({
      url: 'https://res.cloudinary.com/test-cloud/image/upload/images/img-1/original.jpg',
      publicId: 'images/img-1/original',
      contentType: 'image/jpeg',
      bytes: 1234,
    });
    prismaMock.image.create.mockImplementation(async ({ data }: { data: { id: string; url: string } }) => ({
      id: data.id,
      url: data.url,
    }));
  });

  describe('getOrCreateSystemUser', () => {
    it('returns the existing system user without creating', async () => {
      const user = await getOrCreateSystemUser();
      expect(user.id).toBe('user-1');
      expect(prismaMock.user.upsert).not.toHaveBeenCalled();
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'system.gallery@localhost:3000' } }),
      );
    });

    it('upserts the system user with a hashed random password when absent (race-safe)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.upsert.mockResolvedValue({ id: 'user-2' });
      const user = await getOrCreateSystemUser();
      expect(user.id).toBe('user-2');
      expect(prismaMock.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'system.gallery@localhost:3000' },
          update: {},
        }),
      );
    });
  });

  describe('processGalleryFile', () => {
    it('stores original bytes as-is and publishes the gallery Image', async () => {
      const outcome = await processGalleryFile(makeFile(), 'user-1');
      expect(outcome.ok).toBe(true);
      if (outcome.ok) {
        expect(outcome.url).toBe(
          'https://res.cloudinary.com/test-cloud/image/upload/images/img-1/original.jpg',
        );
      }
      expect(putStorageFileMock).toHaveBeenCalledWith(
        expect.stringMatching(/^images\/[0-9a-f-]{36}\/original$/),
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'image/jpeg' }),
      );
      expect(prismaMock.image.create).toHaveBeenCalledTimes(1);
    });

    it('rejects empty files', async () => {
      const outcome = await processGalleryFile(makeFile({ bytes: Buffer.alloc(0) }), 'user-1');
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error).toContain('kosong');
      expect(putStorageFileMock).not.toHaveBeenCalled();
    });

    it('rejects files over the size cap', async () => {
      const big = Buffer.alloc(11 * 1024 * 1024, 1);
      const outcome = await processGalleryFile(makeFile({ bytes: big }), 'user-1');
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error).toContain('10 MB');
    });

    it('rejects unsupported MIME types', async () => {
      const outcome = await processGalleryFile(
        makeFile({ mimeType: 'application/pdf', filename: 'doc.pdf' }),
        'user-1',
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error).toContain('Format tidak didukung');
    });

    it('returns a failure outcome when storage errors', async () => {
      putStorageFileMock.mockRejectedValue(new Error('storage down'));
      const outcome = await processGalleryFile(makeFile(), 'user-1');
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error).toContain('Gagal menyimpan');
      expect(prismaMock.image.create).not.toHaveBeenCalled();
    });
  });

  describe('processGalleryBatch', () => {
    it('processes each file and keeps per-file outcomes independent', async () => {
      putStorageFileMock.mockRejectedValueOnce(new Error('boom')); // first file fails
      const outcomes = await processGalleryBatch([makeFile(), makeFile({ filename: 'b.jpg' })]);
      expect(outcomes).toHaveLength(2);
      expect(outcomes[0].ok).toBe(false);
      expect(outcomes[1].ok).toBe(true);
    });

    it('throws when the batch exceeds the max file count', async () => {
      const tooMany = Array.from({ length: MAX_BATCH_FILES + 1 }, () => makeFile());
      await expect(processGalleryBatch(tooMany)).rejects.toThrow('Maksimal');
    });
  });
});
