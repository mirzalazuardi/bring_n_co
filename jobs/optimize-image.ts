import { task } from '@trigger.dev/sdk';
import { prisma } from '@/lib/prisma';
import { claimForProcessing, markCompleted, markFailed } from '@/lib/images/claim';
import { classifyError } from '@/lib/images/classify';
import {
  buildVariants,
  detectImageFormat,
  downloadWithLimit,
  ImageValidationError,
} from '@/lib/images/process';
import { originalKey, variantKey } from '@/lib/images/keys';
import { variantMetaSchema, type VariantsMap } from '@/lib/images/schemas';
import { put } from '@vercel/blob';
import { env } from '@/lib/env';

/**
 * Durable image optimization task (Trigger.dev v4).
 *
 * Idempotency: atomic QUEUED→PROCESSING claim keyed by run id; deterministic
 * variant keys make re-uploads safe overwrites. Permanent validation errors
 * mark the record FAILED without retry; transient errors rethrow so the
 * runtime retries (max 3 attempts, exponential backoff).
 *
 * BullMQ swap path: the actual work lives in lib/images/* — a self-hosted
 * worker would call the same functions from a BullMQ processor instead of
 * this task wrapper.
 */
export const optimizeImageTask = task({
  id: 'optimize-image',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: { imageId: string }, { ctx }) => {
    const { imageId } = payload;
    const jobRunId = ctx.run.id;
    const log = (msg: string) => console.log(`[optimize-image ${imageId}] ${msg}`);

    const asset = await prisma.imageAsset.findUnique({ where: { id: imageId } });
    if (!asset) {
      log('asset not found — nothing to do');
      return { status: 'not_found' as const };
    }
    if (asset.status === 'COMPLETED' && !payloadShouldForce(payload)) {
      log('already completed — skipping');
      return { status: 'already_completed' as const };
    }

    const claim = await claimForProcessing(imageId, jobRunId);
    if (claim.outcome === 'skip') {
      log(`skipped — owned by another run (${claim.outcome})`);
      return { status: 'skipped' as const };
    }

    try {
      if (!asset.originalUrl) {
        throw new ImageValidationError('DOWNLOAD_FAILED', 'Original image URL is missing.');
      }

      // 1. Download with hard byte cap (stored Blob URL — never user-supplied)
      const buffer = await downloadWithLimit(asset.originalUrl);

      // 2. Validate real format from bytes (throws ImageValidationError on bad input)
      const detected = await detectImageFormat(buffer, asset.originalMime ?? undefined);

      // 3. Generate WebP variants (EXIF-baked, never enlarged, metadata-stripped)
      const { source, variants } = await buildVariants(buffer);

      // 4. Upload variants to deterministic keys (safe overwrites on retry)
      const variantEntries = await Promise.all(
        Object.entries(variants).map(async ([name, v]) => {
          if (!v) return null;
          const key = variantKey(imageId, name as keyof typeof variants);
          const blob = await put(key, v.buffer, {
            access: 'public',
            contentType: 'image/webp',
            token: env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: false,
          });
          return [
            name,
            variantMetaSchema.parse({
              key,
              url: blob.url,
              width: v.width,
              height: v.height,
              size: v.buffer.byteLength,
              mime: 'image/webp',
            }),
          ] as const;
        }),
      );

      const variantsMap = Object.fromEntries(
        variantEntries.filter((e): e is NonNullable<typeof e> => e !== null),
      ) as VariantsMap;

      if (Object.keys(variantsMap).length === 0) {
        throw new ImageValidationError('PROCESSING_FAILED', 'No variants could be generated.');
      }

      // 5. Complete: record dimensions of the (post-rotate) source + variant metadata
      await markCompleted(imageId, {
        variants: variantsMap,
        width: source.width,
        height: source.height,
        jobRunId,
      });
      log(`completed with ${Object.keys(variantsMap).length} variants`);

      return { status: 'completed' as const, variants: Object.keys(variantsMap) };
    } catch (error) {
      const { category, message } = classifyError(error);
      const isPermanent =
        error instanceof ImageValidationError ? error.isPermanent : false;

      await markFailed(imageId, category, message, jobRunId);

      if (isPermanent) {
        // Bad input will never succeed — stop retrying for good
        log(`permanent failure (${category}) — no retry`);
        return { status: 'failed_permanent' as const, category };
      }

      // Transient (network/storage/db) — rethrow for runtime retry w/ backoff
      log(`transient failure (${category}) — will retry`);
      throw error;
    }
  },
});

function payloadShouldForce(payload: { imageId: string } & { force?: boolean }): boolean {
  return payload.force === true;
}
