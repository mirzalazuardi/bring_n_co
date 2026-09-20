import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { imageIdParamsSchema } from '@/lib/images/schemas';
import { upsertQueuedAndTrigger } from '@/lib/images/finalize';
import {
  headStorageFile,
  isStorageConfigured,
  originalPublicId,
} from '@/lib/storage/cloudinary';

export const runtime = 'nodejs';

/**
 * Client-driven finalize: after the direct upload to Cloudinary finishes, the
 * uploader calls this endpoint. The server verifies the asset exists
 * (authoritative `head` on the deterministic public_id — no client URLs, so
 * no SSRF surface), creates the QUEUED row idempotently, and triggers the
 * durable job.
 *
 * With Cloudinary there is no server-to-server completion callback, so this
 * endpoint is the single finalize path (the old Blob `onUploadCompleted`
 * redundancy is gone).
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

  if (!isStorageConfigured()) {
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
    // Authoritative check: the asset must exist under OUR deterministic id.
    // The client can never point this at an arbitrary URL (SSRF-safe).
    const stored = await headStorageFile(originalPublicId(imageId));
    if (!stored) {
      // Upload hasn't landed (yet). No row, no job.
      return NextResponse.json(
        { success: false, error: 'Upload not found — retry shortly.' },
        { status: 409 },
      );
    }

    await upsertQueuedAndTrigger({
      imageId,
      userId,
      url: stored.url,
      contentType: stored.contentType,
    });

    return NextResponse.json({ success: true, data: { id: imageId, status: 'queued' } }, { status: 202 });
  } catch (error) {
    console.error('POST /api/images/[id]/finalize error:', error);
    return NextResponse.json({ success: false, error: 'Could not finalize upload' }, { status: 500 });
  }
}
