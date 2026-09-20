import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { env } from '@/lib/env';
import { validateUploadRequest } from '@/lib/images/upload-gate';
import {
  createDirectUploadParams,
  isStorageConfigured,
  originalPublicId,
} from '@/lib/storage/cloudinary';
import { ACCEPTED_MIME_TYPES } from '@/lib/images/process';
import { isUploadOpen, UPLOAD_CLOSED_MESSAGE } from '@/lib/upload-window';

export const runtime = 'nodejs';

const directUploadRequestSchema = z.object({
  imageId: z.string().uuid(),
  size: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
});

/**
 * Direct-upload boundary for Cloudinary. Validates the authenticated user's
 * declared file metadata, then mints a short-lived signed upload payload the
 * browser uses to upload straight to Cloudinary — the API secret never leaves
 * the server, and the signature pins public_id, allowed formats, and max size.
 *
 * The storage layout mirrors the old Blob keys: images/{imageId}/original
 * (Cloudinary appends the detected format extension to the public_id).
 *
 * Completion is client-driven: after the browser upload finishes, the client
 * calls POST /api/images/:id/finalize to verify the asset and queue the
 * optimization job (Cloudinary has no server-to-server completion callback).
 *
 * Rate limiting: add a per-user limiter here (in-memory/Upstash) before
 * exposing at scale — see tasks.md "rate-limit placeholder".
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Image storage is not configured (CLOUDINARY_* env vars missing).',
      },
      { status: 503 },
    );
  }

  // Community upload window: closed until the configured offset after the
  // event date. The admin console has its own route and is unaffected.
  if (!isUploadOpen()) {
    return NextResponse.json(
      { success: false, error: UPLOAD_CLOSED_MESSAGE },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const parsed = directUploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid upload metadata' },
      { status: 400 },
    );
  }
  const { imageId, size, mimeType } = parsed.data;

  // Advisory gate on declared metadata — the optimize worker re-validates
  // from actual bytes after upload.
  const gate = validateUploadRequest({
    filename: originalPublicId(imageId),
    size,
    mimeType,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { success: false, error: gate.message },
      { status: gate.status },
    );
  }

  const params = createDirectUploadParams({
    publicId: originalPublicId(imageId),
    maxBytes: env.MAX_IMAGE_SIZE_MB * 1024 * 1024,
    allowedMimeTypes: ACCEPTED_MIME_TYPES,
  });

  return NextResponse.json({ success: true, data: params });
}
