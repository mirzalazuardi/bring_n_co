import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { uploadRequestSchema } from '@/lib/images/schemas';
import { validateUploadRequest } from '@/lib/images/upload-gate';
import { originalKey } from '@/lib/images/keys';
import { ACCEPTED_MIME_TYPES } from '@/lib/images/process';

export const runtime = 'nodejs';

/**
 * Direct-upload boundary. Issues a short-lived, narrowly-scoped Blob token
 * only to authenticated users whose declared file clears the configured
 * limits. The client supplies the imageId (uuid) so the storage layout is
 * `images/{imageId}/original`; the row is created on upload completion.
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

  let body: HandleUploadBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // pathname must be exactly images/{uuid}/original — anything else is a probe
        const match = /^images\/([0-9a-fA-F-]{36})\/original$/.exec(pathname);
        if (!match) {
          throw new Error('Invalid upload path');
        }
        const imageId = match[1] as string;

        // Declared client metadata (advisory gate — the worker re-validates
        // from bytes). Read defensively across SDK payload shapes.
        const payload = (body as { payload?: { contentType?: string; size?: number; contentLength?: number } })
          .payload;
        const parsed = uploadRequestSchema.safeParse({
          filename: pathname,
          size: payload?.size ?? payload?.contentLength ?? 0,
          mimeType: payload?.contentType ?? '',
        });
        const gate = parsed.success
          ? validateUploadRequest(parsed.data)
          : ({ ok: false, status: 400, category: 'INVALID_FILE', message: 'Invalid upload metadata' } as const);
        if (!gate.ok) {
          throw new Error(gate.message);
        }

        return {
          allowedContentTypes: ACCEPTED_MIME_TYPES,
          maximumSizeInBytes: env.MAX_IMAGE_SIZE_MB * 1024 * 1024,
          tokenPayload: JSON.stringify({ imageId, userId }),
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Authenticated boundary: the payload was issued by us, tamper-proof
        if (!tokenPayload) {
          throw new Error('Missing token payload');
        }
        const { imageId, userId: owner } = JSON.parse(tokenPayload) as {
          imageId: string;
          userId: string;
        };

        // Idempotent on callback retries (unique originalKey). Blob client
        // completion events carry no size — the worker records it from bytes.
        await prisma.imageAsset.upsert({
          where: { originalKey: originalKey(imageId) },
          create: {
            id: imageId,
            userId: owner,
            originalKey: originalKey(imageId),
            originalUrl: blob.url,
            originalMime: blob.contentType,
            status: 'QUEUED',
          },
          update: {
            originalUrl: blob.url,
            originalMime: blob.contentType,
          },
        });

        // Queue the durable job. On failure the row stays QUEUED; the
        // reprocess endpoint is the recovery path (documented in README).
        const { tasks } = await import('@trigger.dev/sdk');
        await tasks.trigger('optimize-image', { imageId });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    // Never leak internals; map known validation failures to 400
    const message = error instanceof Error ? error.message : '';
    const isValidation = /Invalid upload path|MB or smaller|Unsupported image format|empty or invalid|Invalid upload metadata/.test(
      message,
    );
    console.error('POST /api/images/upload error:', error);
    return NextResponse.json(
      { success: false, error: isValidation ? message : 'Upload could not be processed' },
      { status: isValidation ? 400 : 500 },
    );
  }
}
