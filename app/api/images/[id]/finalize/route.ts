import { head } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { env } from '@/lib/env';
import { imageIdParamsSchema } from '@/lib/images/schemas';
import { originalKey } from '@/lib/images/keys';
import { upsertQueuedAndTrigger } from '@/lib/images/finalize';

export const runtime = 'nodejs';

/**
 * Client-driven finalize: after the direct upload finishes, the uploader calls
 * this endpoint. The server verifies the blob exists (authoritative `head` on
 * the deterministic key — no client URLs, so no SSRF surface), creates the
 * QUEUED row idempotently, and triggers the durable job.
 *
 * Why this exists in addition to `onUploadCompleted`: the completion callback
 * is delivered server-to-server by Vercel's cloud to `callbackUrl`. On
 * localhost that URL is unreachable, so without finalize the row is never
 * created in local dev; in production it stays as a redundant second path
 * (both funnel into the same idempotent helper).
 *
 * Rate limiting: share the upload route's per-user limiter before scale.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { success: false, error: 'Image storage is not configured.' },
      { status: 503 },
    );
  }

  const { id } = await params;
  const parsed = imageIdParamsSchema.safeParse({ id });
  if (!parsed.success) {
    // Malformed id → indistinguishable from unknown (no existence leak)
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }
  const imageId = parsed.data.id;

  try {
    // Authoritative check: the blob must exist under OUR deterministic key.
    // The client can never point this at an arbitrary URL (SSRF-safe).
    const blob = await head(originalKey(imageId));

    await upsertQueuedAndTrigger({
      imageId,
      userId,
      url: blob.url,
      contentType: blob.contentType,
    });

    return NextResponse.json({ success: true, data: { id: imageId, status: 'queued' } }, { status: 202 });
  } catch (error) {
    // BlobNotFoundError → upload hasn't landed (yet). No row, no job.
    if (error instanceof Error && error.name === 'BlobNotFoundError') {
      return NextResponse.json(
        { success: false, error: 'Upload not found — retry shortly.' },
        { status: 409 },
      );
    }
    console.error('POST /api/images/[id]/finalize error:', error);
    return NextResponse.json({ success: false, error: 'Could not finalize upload' }, { status: 500 });
  }
}
