import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { env } from '@/lib/env';
import { uploadRequestSchema } from '@/lib/images/schemas';
import { validateUploadRequest } from '@/lib/images/upload-gate';
import { upsertQueuedAndTrigger } from '@/lib/images/finalize';
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

  // Fail fast with a truthful error — otherwise the SDK wraps our 500 into
  // the opaque "Failed to retrieve the client token" on the client.
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error: 'Image storage is not configured (BLOB_READ_WRITE_TOKEN missing).',
      },
      { status: 503 },
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
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // pathname must be exactly images/{uuid}/original — anything else is a probe
        const match = /^images\/([0-9a-fA-F-]{36})\/original$/.exec(pathname);
        if (!match) {
          throw new Error('Invalid upload path');
        }
        const imageId = match[1] as string;

        // Client-declared metadata rides the SDK's clientPayload channel —
        // the token-request payload itself carries only pathname/clientPayload/
        // multipart, so size/type MUST come from the client options.
        // Advisory gate: the worker still re-validates from actual bytes.
        let declared: { size?: number; contentType?: string } | undefined;
        try {
          declared = clientPayload
            ? (JSON.parse(clientPayload) as { size?: number; contentType?: string })
            : undefined;
        } catch {
          declared = undefined;
        }
        const parsed = uploadRequestSchema.safeParse({
          filename: pathname,
          size: declared?.size,
          mimeType: declared?.contentType,
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
        // Authenticated boundary: the payload was issued by us, tamper-proof.
        // Shares the idempotent path with the client-driven finalize route.
        if (!tokenPayload) {
          throw new Error('Missing token payload');
        }
        const { imageId, userId: owner } = JSON.parse(tokenPayload) as {
          imageId: string;
          userId: string;
        };

        await upsertQueuedAndTrigger({
          imageId,
          userId: owner,
          url: blob.url,
          contentType: blob.contentType,
        });
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
