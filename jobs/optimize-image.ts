import { task } from '@trigger.dev/sdk';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { runOptimizeImage } from '@/lib/images/run-optimize';

/**
 * Durable image optimization task (Trigger.dev v4) — thin wrapper around
 * `runOptimizeImage` (lib/images/run-optimize.ts), which owns all logic.
 *
 * Retry policy: max 3 attempts, exponential backoff. Permanent validation
 * errors return `failed_permanent` without rethrowing; transient errors
 * rethrow for runtime retry.
 *
 * BullMQ swap path: a self-hosted worker imports `runOptimizeImage` and
 * calls it from a processor with its own run id — nothing else changes.
 */
export const optimizeImageTask = task({
  id: 'optimize-image',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: { imageId: string }, { ctx }) =>
    runOptimizeImage(payload.imageId, ctx.run.id, { prisma, blobPut: put }),
});
