import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    imageAsset: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    image: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { runOptimizeImage, type VariantPutter } from '../lib/images/run-optimize';

const findUnique = vi.mocked(prisma.imageAsset.findUnique);
const updateMany = vi.mocked(prisma.imageAsset.updateMany);
const galleryUpsert = vi.mocked(prisma.image.upsert);

/** In-memory storage putter the runner depends on (DI seam). */
const putVariant = vi.fn<VariantPutter>();

async function jpegBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 90, g: 168, b: 132 } },
  })
    .jpeg()
    .toBuffer();
}

/** In-memory asset record the mocked prisma reads/writes. */
function assetFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: 'user-1',
    originalKey: 'images/11111111-1111-4111-8111-111111111111/original',
    originalUrl: 'https://res.cloudinary.com/test-cloud/image/upload/images/x/original.jpg',
    originalMime: 'image/jpeg',
    originalSize: BigInt(1234),
    status: 'QUEUED',
    width: null,
    height: null,
    variants: null,
    errorMessage: null,
    errorCategory: null,
    jobRunId: null,
    title: 'Reunion photo',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    processedAt: null,
    ...overrides,
  };
}

function mockHappyPrisma(asset: ReturnType<typeof assetFixture>) {
  findUnique.mockResolvedValue(asset as never);
  // claim QUEUED→PROCESSING, markCompleted, markFailed all go through updateMany
  updateMany.mockResolvedValue({ count: 1 });
  galleryUpsert.mockResolvedValue({} as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  updateMany.mockReset();
  putVariant.mockReset();
  putVariant.mockImplementation(async (publicId: string) => ({
    url: `https://res.cloudinary.com/test-cloud/image/upload/${publicId}.webp`,
  }));
});

describe('runOptimizeImage — full flow', () => {
  it('runs queued → completed: downloads, validates, uploads 3 WebP variants, links gallery', async () => {
    const buffer = await jpegBuffer(2000, 1200);
    // The runner downloads originalUrl via global fetch
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array(buffer), {
        status: 200,
        headers: { 'content-length': String(buffer.byteLength) },
      }),
    );

    mockHappyPrisma(assetFixture());

    const result = await runOptimizeImage(assetFixture().id, 'run-1', {
      prisma,
      putVariant,
    });

    expect(result).toEqual({
      status: 'completed',
      variants: ['thumbnail', 'medium', 'large'],
    });

    // 3 deterministic variant uploads (extension-less Cloudinary public ids)
    expect(putVariant).toHaveBeenCalledTimes(3);
    const publicIds = putVariant.mock.calls.map((c) => c[0]);
    expect(publicIds).toEqual([
      'images/11111111-1111-4111-8111-111111111111/thumbnail',
      'images/11111111-1111-4111-8111-111111111111/medium',
      'images/11111111-1111-4111-8111-111111111111/large',
    ]);

    // completion write carries WebP variants + source dims
    const completion = updateMany.mock.calls.find(
      (c) => (c[0] as { data: { status?: string } }).data.status === 'COMPLETED',
    );
    expect(completion).toBeDefined();
    const data = completion![0] as { data: { width: number; height: number; variants: Record<string, { mime: string }> } };
    expect(data.data.width).toBe(2000);
    expect(data.data.height).toBe(1200);
    expect(data.data.variants.medium.mime).toBe('image/webp');

    // gallery linked exactly once via imageAssetId
    expect(galleryUpsert).toHaveBeenCalledTimes(1);
    expect(galleryUpsert.mock.calls[0][0]).toMatchObject({
      where: { imageAssetId: assetFixture().id },
      create: expect.objectContaining({ userId: 'user-1', title: 'Reunion photo' }),
    });
  });

  it('is idempotent: already-COMPLETED assets are not reprocessed', async () => {
    findUnique.mockResolvedValue(assetFixture({ status: 'COMPLETED' }) as never);
    const result = await runOptimizeImage(assetFixture().id, 'run-2', { prisma, putVariant });
    expect(result).toEqual({ status: 'already_completed' });
    expect(putVariant).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('is idempotent: duplicate run skips when another run owns the claim', async () => {
    findUnique.mockResolvedValue(assetFixture() as never);
    // claim attempts all miss
    updateMany.mockResolvedValue({ count: 0 });
    const result = await runOptimizeImage(assetFixture().id, 'run-other', { prisma, putVariant });
    expect(result).toEqual({ status: 'skipped' });
    expect(putVariant).not.toHaveBeenCalled();
  });

  it('marks FAILED without retry on corrupt input (permanent)', async () => {
    const corrupt = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array(corrupt), { status: 200 }),
    );
    mockHappyPrisma(assetFixture());

    const result = await runOptimizeImage(assetFixture().id, 'run-1', { prisma, putVariant });

    expect(result).toEqual({ status: 'failed_permanent', category: 'INVALID_FILE' });
    const failure = updateMany.mock.calls.find(
      (c) => (c[0] as { data: { status?: string } }).data.status === 'FAILED',
    );
    expect(failure).toBeDefined();
    expect((failure![0] as { data: { errorCategory: string } }).data.errorCategory).toBe('INVALID_FILE');
  });

  it('marks FAILED and rethrows on transient storage errors (for runtime retry)', async () => {
    const buffer = await jpegBuffer(2000, 1200);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array(buffer), { status: 200 }),
    );
    mockHappyPrisma(assetFixture());
    putVariant.mockRejectedValueOnce(new Error('storage 503'));

    await expect(
      runOptimizeImage(assetFixture().id, 'run-1', { prisma, putVariant }),
    ).rejects.toThrow('Could not store the optimized image.');

    const failure = updateMany.mock.calls.find(
      (c) => (c[0] as { data: { status?: string } }).data.status === 'FAILED',
    );
    expect(failure).toBeDefined();
    expect((failure![0] as { data: { errorCategory: string } }).data.errorCategory).toBe('STORAGE_FAILED');
  });

  it('aborts oversized downloads with FILE_TOO_LARGE (no content-length header)', async () => {
    // 12 MB body vs 10 MB limit + 10% headroom (11 MB cap) → streaming abort
    const big = Buffer.alloc(12 * 1024 * 1024, 1);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array(big), { status: 200 }),
    );
    mockHappyPrisma(assetFixture());

    const result = await runOptimizeImage(assetFixture().id, 'run-1', { prisma, putVariant });
    expect(result).toEqual({ status: 'failed_permanent', category: 'FILE_TOO_LARGE' });
    expect(putVariant).not.toHaveBeenCalled();
  });
});
