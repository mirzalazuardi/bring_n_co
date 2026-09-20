import { prisma } from '@/lib/prisma';
import { deleteStorageFiles, isStorageConfigured, publicIdFromUrl } from '@/lib/storage/cloudinary';

/**
 * Admin batch gallery deletion — removes gallery photos fully:
 * 1. Storage assets: the gallery `url`, plus original + WebP variants when the
 *    photo came from the optimization pipeline (matched via imageAssetId).
 *    Cloudinary public_ids are derived from the stored URLs.
 * 2. The gallery `Image` row.
 * 3. The pipeline `ImageAsset` row (when present).
 *
 * Storage deletion never blocks the DB cleanup: failures are recorded
 * in `blobErrors` so the committee can see partial results instead of a
 * cryptic 500.
 */

export type DeleteOutcome =
  | { id: string; ok: true; blobErrors: string[] }
  | { id: string; ok: false; error: string };

export interface DeleteReport {
  total: number;
  deleted: number;
  failed: number;
  blobErrors: string[];
  results: DeleteOutcome[];
}

/** Max photos per delete request. */
export const MAX_BATCH_DELETE = 50;

export async function deleteGalleryImages(ids: string[]): Promise<DeleteReport> {
  if (ids.length === 0) {
    throw new Error('Tidak ada foto yang dipilih.');
  }
  if (ids.length > MAX_BATCH_DELETE) {
    throw new Error(`Maksimal ${MAX_BATCH_DELETE} foto per permintaan hapus.`);
  }

  const rows = await prisma.image.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, imageAssetId: true },
  });

  const foundIds = new Set(rows.map((r) => r.id));

  // 1. Collect every blob URL tied to each gallery photo
  const assets = await prisma.imageAsset.findMany({
    where: { id: { in: rows.map((r) => r.imageAssetId).filter((v): v is string => Boolean(v)) } },
    select: { id: true, variants: true },
  });
  const assetById = new Map(assets.map((a) => [a.id, a]));

  const urlsPerImage = new Map<string, string[]>();
  for (const row of rows) {
    const urls: string[] = [row.url];
    if (row.imageAssetId) {
      const variants = assetById.get(row.imageAssetId)?.variants as
        | Record<string, { url: string }>
        | null
        | undefined;
      for (const v of Object.values(variants ?? {})) {
        if (v?.url) urls.push(v.url);
      }
    }
    urlsPerImage.set(row.id, urls);
  }

  // 2. Storage cleanup — tolerate failures (orphaned assets are logged, not fatal).
  //    URLs that don't parse to a Cloudinary public_id (legacy/mock rows) are skipped.
  const blobErrors: string[] = [];
  const allUrls = [...new Set(rows.flatMap((r) => urlsPerImage.get(r.id) ?? []))];
  const publicIds = [...new Set(allUrls.map(publicIdFromUrl).filter((v): v is string => Boolean(v)))];
  if (publicIds.length > 0 && isStorageConfigured()) {
    try {
      await deleteStorageFiles(publicIds);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      blobErrors.push(`Gagal menghapus sebagian berkas di storage: ${msg}`);
    }
  }

  // 3. DB cleanup — gallery rows first, then their pipeline assets
  let deletedCount = 0;
  const results: DeleteOutcome[] = [];
  try {
    const imageDelete = await prisma.image.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    deletedCount = imageDelete.count;

    await prisma.imageAsset.deleteMany({
      where: { id: { in: rows.map((r) => r.imageAssetId).filter((v): v is string => Boolean(v)) } },
    });

    for (const id of ids) {
      // Unknown ids are reported per-file so the committee sees exactly what
      // succeeded instead of a generic failure.
      results.push(
        foundIds.has(id)
          ? { id, ok: true, blobErrors: [] }
          : { id, ok: false, error: 'Foto tidak ditemukan (mungkin sudah dihapus).' },
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    for (const id of ids) {
      results.push({ id, ok: false, error: `Gagal menghapus dari database: ${msg}` });
    }
    return {
      total: ids.length,
      deleted: 0,
      failed: ids.length,
      blobErrors,
      results,
    }
  }

  return {
    total: ids.length,
    deleted: deletedCount,
    failed: ids.length - deletedCount,
    blobErrors,
    results,
  };
}
