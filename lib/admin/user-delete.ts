import { prisma } from '@/lib/prisma';
import { deleteStorageFiles, isStorageConfigured, publicIdFromUrl } from '@/lib/storage/cloudinary';

/**
 * Admin user deletion — removes an alumnus and every trace:
 *
 * 1. Storage: the transfer-proof (from Registration), plus community gallery
 *    originals and any optimization-pipeline variants (Image + ImageAsset);
 *    Cloudinary public_ids are derived from the stored URLs. Deletion never
 *    blocks the DB cleanup — failures are recorded in `blobErrors` so the
 *    committee sees partial results.
 * 2. Database: the `User` row. `onDelete: Cascade` on Registration, Image,
 *    ImageAsset, Account, and Session removes the rest atomically.
 *
 * The route layer (DELETE /api/admin/users/:id) owns auth + validation; this
 * module owns the destructive mechanics and its reporting contract.
 */

export type UserDeleteOutcome =
  | { ok: true; blobErrors: string[] }
  | { ok: false; error: string };

/** Collect every blob URL owned by the user. */
async function collectUserBlobUrls(userId: string): Promise<string[]> {
  const urls: string[] = [];

  const [registration, images, assets] = await Promise.all([
    prisma.registration.findUnique({
      where: { userId },
      select: { bankTransferProofUrl: true },
    }),
    prisma.image.findMany({
      where: { userId },
      select: { url: true, imageAssetId: true },
    }),
    prisma.imageAsset.findMany({
      where: { userId },
      select: { variants: true },
    }),
  ]);

  if (registration?.bankTransferProofUrl) {
    urls.push(registration.bankTransferProofUrl);
  }
  for (const img of images) urls.push(img.url);
  for (const asset of assets) {
    const variants = asset.variants as Record<string, { url: string }> | null | undefined;
    for (const v of Object.values(variants ?? {})) {
      if (v?.url) urls.push(v.url);
    }
  }

  return [...new Set(urls)];
}

/**
 * Delete a user and all their data. Throws only on invalid input; storage or
 * database failures are reported through the outcome, not thrown, so the
 * committee always gets a readable explanation.
 */
export async function deleteUserAndData(userId: string): Promise<UserDeleteOutcome> {
  if (!userId) {
    return { ok: false, error: 'ID pengguna tidak valid.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return { ok: false, error: 'Pengguna tidak ditemukan (mungkin sudah dihapus).' };
  }

  // 1. Storage cleanup first (rows carry the URLs we need). Tolerate failures —
  //    orphaned assets are logged, never fatal. URLs that don't parse to a
  //    Cloudinary public_id (legacy/mock rows) are skipped.
  const blobErrors: string[] = [];
  try {
    const urls = await collectUserBlobUrls(userId);
    const publicIds = [...new Set(urls.map(publicIdFromUrl).filter((v): v is string => Boolean(v)))];
    if (publicIds.length > 0 && isStorageConfigured()) {
      await deleteStorageFiles(publicIds);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    blobErrors.push(`Gagal menghapus sebagian berkas di storage: ${msg}`);
  }

  // 2. DB cleanup — cascades Registration, Image, ImageAsset, Account, Session.
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Gagal menghapus dari database: ${msg}` };
  }

  return { ok: true, blobErrors };
}
