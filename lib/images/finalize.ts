import { prisma } from '@/lib/prisma';
import { originalKey } from '@/lib/images/keys';

/**
 * Shared completion path for both finalize mechanisms:
 * - `onUploadCompleted` (Vercel's server-to-server callback — production)
 * - `POST /api/images/:id/finalize` (client-driven — required on localhost,
 *   redundant safety net in production)
 *
 * Idempotent: unique `originalKey` upsert + re-triggering an already-claimed
 * job is a no-op for the worker's state machine.
 */
export async function upsertQueuedAndTrigger(args: {
  imageId: string;
  userId: string;
  url: string;
  contentType: string | null;
}): Promise<void> {
  await prisma.imageAsset.upsert({
    where: { originalKey: originalKey(args.imageId) },
    create: {
      id: args.imageId,
      userId: args.userId,
      originalKey: originalKey(args.imageId),
      originalUrl: args.url,
      originalMime: args.contentType,
      status: 'QUEUED',
    },
    update: { originalUrl: args.url, originalMime: args.contentType },
  });

  // Queue the durable job. On failure the row stays QUEUED; the reprocess
  // endpoint is the recovery path (documented in README).
  const { tasks } = await import('@trigger.dev/sdk');
  await tasks.trigger('optimize-image', { imageId: args.imageId });
}
