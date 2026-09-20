import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  image: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  imageAsset: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
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

import { deleteGalleryImages, MAX_BATCH_DELETE } from '../lib/admin/gallery-delete';

const IMG_ID = 'cmimg000000000000000000001';
const URL_MAIN =
  'https://res.cloudinary.com/test-cloud/image/upload/images/img-1/original.jpg';
const URL_VARIANT =
  'https://res.cloudinary.com/test-cloud/image/upload/images/img-1/medium.webp';

function mockRows() {
  prismaMock.image.findMany.mockResolvedValue([
    { id: IMG_ID, url: URL_MAIN, imageAssetId: 'asset-1' },
  ]);
  prismaMock.imageAsset.findMany.mockResolvedValue([
    { id: 'asset-1', variants: { medium: { url: URL_VARIANT } } },
  ]);
  prismaMock.image.deleteMany.mockResolvedValue({ count: 1 });
  prismaMock.imageAsset.deleteMany.mockResolvedValue({ count: 1 });
}

describe('admin gallery batch delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRows();
  });

  it('deletes storage assets (url + variants), gallery rows, and asset rows', async () => {
    const report = await deleteGalleryImages([IMG_ID]);

    expect(report.deleted).toBe(1);
    expect(report.failed).toBe(0);
    // Public ids derived from the stored URLs (extension stripped)
    expect(deleteStorageFilesMock).toHaveBeenCalledWith([
      'images/img-1/original',
      'images/img-1/medium',
    ]);
    expect(prismaMock.image.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [IMG_ID] } },
    });
    expect(prismaMock.imageAsset.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['asset-1'] } },
    });
    expect(report.results[0]).toEqual({ id: IMG_ID, ok: true, blobErrors: [] });
  });

  it('reports unknown ids as failed per-file', async () => {
    const report = await deleteGalleryImages([IMG_ID, 'cmnonexistent0000000000000']);
    expect(report.deleted).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.results[1]).toMatchObject({ ok: false });
  });

  it('still cleans the DB when storage deletion fails (errors recorded)', async () => {
    deleteStorageFilesMock.mockRejectedValue(new Error('storage unavailable'));
    const report = await deleteGalleryImages([IMG_ID]);
    expect(report.deleted).toBe(1);
    expect(report.blobErrors[0]).toContain('storage unavailable');
  });

  it('handles photos without a pipeline asset (direct admin upload)', async () => {
    prismaMock.image.findMany.mockResolvedValue([
      { id: IMG_ID, url: URL_MAIN, imageAssetId: null },
    ]);
    prismaMock.imageAsset.findMany.mockResolvedValue([]);
    const report = await deleteGalleryImages([IMG_ID]);
    expect(report.deleted).toBe(1);
    expect(deleteStorageFilesMock).toHaveBeenCalledWith(['images/img-1/original']);
    expect(prismaMock.imageAsset.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [] } },
    });
  });

  it('skips storage deletion when no URL parses to a public id (legacy rows)', async () => {
    prismaMock.image.findMany.mockResolvedValue([
      { id: IMG_ID, url: 'https://mock.res.cloudinary.com/image/upload/x.jpg', imageAssetId: null },
    ]);
    prismaMock.imageAsset.findMany.mockResolvedValue([]);
    const report = await deleteGalleryImages([IMG_ID]);
    expect(report.deleted).toBe(1);
    expect(deleteStorageFilesMock).not.toHaveBeenCalled();
  });

  it('rejects empty and oversized batches', async () => {
    await expect(deleteGalleryImages([])).rejects.toThrow('Tidak ada foto');
    const tooMany = Array.from({ length: MAX_BATCH_DELETE + 1 }, (_, i) => `id-${i}`);
    await expect(deleteGalleryImages(tooMany)).rejects.toThrow('Maksimal');
  });
});
