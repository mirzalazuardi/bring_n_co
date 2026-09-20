import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  registration: {
    findUnique: vi.fn(),
  },
  image: {
    findMany: vi.fn(),
  },
  imageAsset: {
    findMany: vi.fn(),
  },
}));

const deleteStorageFilesMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/storage/cloudinary', async (importOriginal) => {
  // Keep the real pure helpers (publicIdFromUrl) — mock only the I/O boundary.
  const actual =
    await importOriginal<typeof import('@/lib/storage/cloudinary')>();
  return {
    ...actual,
    deleteStorageFiles: deleteStorageFilesMock,
    isStorageConfigured: vi.fn(() => true),
  };
});

import { deleteUserAndData } from '../lib/admin/user-delete';

const USER_ID = 'cmuser00000000000000000001';
const PROOF_URL =
  'https://res.cloudinary.com/test-cloud/image/upload/proofs/proof-1.png';
const GALLERY_URL =
  'https://res.cloudinary.com/test-cloud/image/upload/images/img-1/original.jpg';
const VARIANT_URL =
  'https://res.cloudinary.com/test-cloud/image/upload/images/img-1/medium.webp';

function mockExistingUser() {
  prismaMock.user.findUnique.mockResolvedValue({ id: USER_ID });
  prismaMock.user.delete.mockResolvedValue({ id: USER_ID });
  prismaMock.registration.findUnique.mockResolvedValue({
    bankTransferProofUrl: PROOF_URL,
  });
  prismaMock.image.findMany.mockResolvedValue([
    { url: GALLERY_URL, imageAssetId: 'asset-1' },
  ]);
  prismaMock.imageAsset.findMany.mockResolvedValue([
    { variants: { medium: { url: VARIANT_URL } } },
  ]);
}

describe('admin user delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistingUser();
  });

  it('deletes every owned storage asset then the user row', async () => {
    const outcome = await deleteUserAndData(USER_ID);

    expect(outcome).toEqual({ ok: true, blobErrors: [] });
    // Proof + gallery original + pipeline variant, deduplicated, public ids
    // derived from the stored URLs (extension stripped).
    expect(deleteStorageFilesMock).toHaveBeenCalledWith([
      'proofs/proof-1',
      'images/img-1/original',
      'images/img-1/medium',
    ]);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });

  it('reports unknown users without touching storage or the DB', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const outcome = await deleteUserAndData(USER_ID);

    expect(outcome).toEqual({
      ok: false,
      error: 'Pengguna tidak ditemukan (mungkin sudah dihapus).',
    });
    expect(deleteStorageFilesMock).not.toHaveBeenCalled();
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it('still deletes the user when storage cleanup fails (errors recorded)', async () => {
    deleteStorageFilesMock.mockRejectedValue(new Error('storage unavailable'));

    const outcome = await deleteUserAndData(USER_ID);

    expect(outcome.ok).toBe(true);
    expect(outcome.ok === true && outcome.blobErrors[0]).toContain('storage unavailable');
    expect(prismaMock.user.delete).toHaveBeenCalled();
  });

  it('handles users without registration or gallery data', async () => {
    prismaMock.registration.findUnique.mockResolvedValue(null);
    prismaMock.image.findMany.mockResolvedValue([]);
    prismaMock.imageAsset.findMany.mockResolvedValue([]);

    const outcome = await deleteUserAndData(USER_ID);

    expect(outcome).toEqual({ ok: true, blobErrors: [] });
    expect(deleteStorageFilesMock).not.toHaveBeenCalled(); // nothing to delete
    expect(prismaMock.user.delete).toHaveBeenCalled();
  });

  it('returns a failure when the DB delete throws', async () => {
    prismaMock.user.delete.mockRejectedValue(new Error('fk constraint'));

    const outcome = await deleteUserAndData(USER_ID);

    expect(outcome).toEqual({ ok: false, error: 'Gagal menghapus dari database: fk constraint' });
  });

  it('rejects an empty user id up front', async () => {
    const outcome = await deleteUserAndData('');
    expect(outcome.ok).toBe(false);
    expect(deleteStorageFilesMock).not.toHaveBeenCalled();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
