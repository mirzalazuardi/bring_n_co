import type { PrismaClient } from '@prisma/client';
import { claimForProcessing, markCompleted, markFailed } from '@/lib/images/claim';
import { classifyError } from '@/lib/images/classify';
import {
  buildVariants,
  detectImageFormat,
  downloadWithLimit,
  ImageValidationError,
} from '@/lib/images/process';
import { variantPublicId } from '@/lib/storage/cloudinary';
import { variantMetaSchema, type VariantsMap } from '@/lib/images/schemas';

/**
 * Minimal shape of the storage `put` the runner depends on (DI seam for
 * tests/BullMQ) — returns a delivery URL for the stored variant.
 */
export type VariantPutter = (
  publicId: string,
  buffer: Buffer,
) => Promise<{ url: string }>;

export interface RunDeps {
  prisma: PrismaClient;
  putVariant: VariantPutter;
}

export type RunResult =
  | { status: 'not_found' }
  | { status: 'already_completed' }
  | { status: 'skipped' }
  | { status: 'completed'; variants: string[] }
  | { status: 'failed_permanent'; category: string };

/**
 * The full optimization flow, extracted from the Trigger.dev task wrapper so
 * it is directly unit-testable and reusable by a self-hosted BullMQ worker.
 * Every branch is idempotent; all storage I/O goes through injectable deps.
 */
export async function runOptimizeImage(
  imageId: string,
  jobRunId: string,
  deps: RunDeps,
): Promise<RunResult> {
  const { prisma, putVariant } = deps;
  const log = (msg: string) => console.log(`[optimize-image ${imageId}] ${msg}`);

  const asset = await prisma.imageAsset.findUnique({ where: { id: imageId } });
  if (!asset) {
    log('asset not found — nothing to do');
    return { status: 'not_found' };
  }
  if (asset.status === 'COMPLETED') {
    log('already completed — skipping');
    return { status: 'already_completed' };
  }

  const claim = await claimForProcessing(imageId, jobRunId);
  if (claim.outcome === 'skip') {
    log('skipped — owned by another run');
    return { status: 'skipped' };
  }

  try {
    if (!asset.originalUrl) {
      throw new ImageValidationError('DOWNLOAD_FAILED', 'Original image URL is missing.');
    }

    // 1. Download with hard byte cap (stored Blob URL — never user-supplied)
    const buffer = await downloadWithLimit(asset.originalUrl);

    // 2. Validate real format from bytes (throws ImageValidationError on bad input)
    await detectImageFormat(buffer, asset.originalMime ?? undefined);

    // 3. Generate WebP variants (EXIF-baked, never enlarged, metadata-stripped)
    const { source, variants } = await buildVariants(buffer);

    // 4. Upload variants under deterministic public_ids (safe overwrites on retry)
    const entries = await Promise.all(
      Object.entries(variants).map(async ([name, v]) => {
        if (!v) return null;
        const publicId = variantPublicId(imageId, name as keyof typeof variants);
        let url: string;
        try {
          url = (await putVariant(publicId, v.buffer)).url;
        } catch (err) {
          // Surface the underlying cause (auth, network, quota…)
          // before classifying as a transient storage outage for retry.
          console.error(
            `[optimize-image ${imageId}] storage put failed for ${publicId}:`,
            err instanceof Error ? `${err.name}: ${err.message}` : err,
          );
          throw new ImageValidationError('STORAGE_FAILED', 'Could not store the optimized image.');
        }
        return [
          name,
          variantMetaSchema.parse({
            key: publicId,
            url,
            width: v.width,
            height: v.height,
            size: v.buffer.byteLength,
            mime: 'image/webp',
          }),
        ] as const;
      }),
    );

    const variantsMap = Object.fromEntries(
      entries.filter((e): e is NonNullable<typeof e> => e !== null),
    ) as VariantsMap;

    if (Object.keys(variantsMap).length === 0) {
      throw new ImageValidationError('PROCESSING_FAILED', 'No variants could be generated.');
    }

    // 5. Complete: record post-rotate source dimensions + variant metadata
    await markCompleted(imageId, {
      variants: variantsMap,
      width: source.width,
      height: source.height,
      jobRunId,
    });

    // 6. Publish to the community gallery (idempotent via unique imageAssetId)
    const galleryUrl = variantsMap.medium?.url ?? asset.originalUrl ?? '';
    await prisma.image.upsert({
      where: { imageAssetId: imageId },
      create: {
        url: galleryUrl,
        userId: asset.userId,
        imageAssetId: imageId,
        title: asset.title,
        description: asset.description,
      },
      update: { url: galleryUrl },
    });
    log(`completed with ${Object.keys(variantsMap).length} variants, gallery updated`);

    return { status: 'completed', variants: Object.keys(variantsMap) };
  } catch (error) {
    const { category, message } = classifyError(error);
    const isPermanent = error instanceof ImageValidationError ? error.isPermanent : false;

    await markFailed(imageId, category, message, jobRunId);

    if (isPermanent) {
      // Bad input will never succeed — stop retrying for good
      log(`permanent failure (${category}) — no retry`);
      return { status: 'failed_permanent', category };
    }

    // Transient (network/storage/db) — rethrow for runtime retry w/ backoff
    log(`transient failure (${category}) — will retry`);
    throw error;
  }
}
