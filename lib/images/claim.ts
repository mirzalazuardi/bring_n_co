import { prisma } from '@/lib/prisma';

/**
 * Atomic state-machine helpers for the ImageAsset lifecycle.
 * All transitions are conditional updateMany writes — safe under concurrent
 * job runs, duplicate deliveries, and retries.
 */

export type ClaimResult =
  | { outcome: 'claimed' }
  | { outcome: 'reclaimed' } // same Trigger.dev runId retrying after a crash mid-run
  | { outcome: 'skip' }; // owned by another run, or already terminal

/**
 * Claims an image for processing.
 * - Fresh run: QUEUED → PROCESSING (records jobRunId).
 * - Retry of the same Trigger.dev run: PROCESSING + matching jobRunId → kept.
 * - Anything else (another run's, COMPLETED, FAILED) → skip.
 */
export async function claimForProcessing(imageId: string, jobRunId: string): Promise<ClaimResult> {
  const claimed = await prisma.imageAsset.updateMany({
    where: { id: imageId, status: 'QUEUED' },
    data: { status: 'PROCESSING', jobRunId },
  });
  if (claimed.count === 1) return { outcome: 'claimed' };

  const mine = await prisma.imageAsset.updateMany({
    where: { id: imageId, status: 'PROCESSING', jobRunId },
    data: { jobRunId },
  });
  return mine.count === 1 ? { outcome: 'reclaimed' } : { outcome: 'skip' };
}

/** Marks a completed image, clearing error fields. Idempotent by nature. */
export async function markCompleted(
  imageId: string,
  data: {
    variants: unknown;
    width: number;
    height: number;
    jobRunId: string;
  },
): Promise<void> {
  await prisma.imageAsset.updateMany({
    where: { id: imageId },
    data: {
      status: 'COMPLETED',
      variants: data.variants as object,
      width: data.width,
      height: data.height,
      jobRunId: data.jobRunId,
      errorMessage: null,
      errorCategory: null,
      processedAt: new Date(),
    },
  });
}

/** Marks a permanently failed image with its user-safe category. */
export async function markFailed(
  imageId: string,
  category: string,
  message: string,
  jobRunId: string,
): Promise<void> {
  await prisma.imageAsset.updateMany({
    where: { id: imageId },
    data: {
      status: 'FAILED',
      errorCategory: category as never,
      errorMessage: message,
      jobRunId,
    },
  });
}

/**
 * Reprocess gate: resets a FAILED image to QUEUED. Returns false when the
 * image is not in FAILED state (caller maps that to 409).
 */
export async function resetForReprocess(imageId: string): Promise<boolean> {
  const reset = await prisma.imageAsset.updateMany({
    where: { id: imageId, status: 'FAILED' },
    data: {
      status: 'QUEUED',
      errorMessage: null,
      errorCategory: null,
      jobRunId: null,
      processedAt: null,
    },
  });
  return reset.count === 1;
}
