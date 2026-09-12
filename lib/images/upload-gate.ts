import { env } from '@/lib/env';
import { ACCEPTED_MIME_TYPES } from '@/lib/images/process';
import type { ErrorCategory } from '@/lib/images/schemas';

export interface UploadRequestInput {
  filename: string;
  size: number;
  mimeType: string;
}

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; status: number; category: ErrorCategory; message: string };

/**
 * Server-side gate for client-direct uploads. Client-declared MIME and size
 * are advisory (the worker re-validates from bytes), but they must clear the
 * configured limits before any Blob token is generated.
 */
export function validateUploadRequest(input: UploadRequestInput): UploadValidationResult {
  const maxBytes = env.MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return {
      ok: false,
      status: 400,
      category: 'INVALID_FILE',
      message: 'The selected file is empty or invalid.',
    };
  }
  if (input.size > maxBytes) {
    return {
      ok: false,
      status: 400,
      category: 'FILE_TOO_LARGE',
      message: `Images must be ${env.MAX_IMAGE_SIZE_MB} MB or smaller.`,
    };
  }
  if (!ACCEPTED_MIME_TYPES.includes(input.mimeType.toLowerCase())) {
    return {
      ok: false,
      status: 400,
      category: 'UNSUPPORTED_FORMAT',
      message: 'Unsupported image format. Use JPEG, PNG, WebP, GIF, AVIF, or TIFF.',
    };
  }
  return { ok: true };
}
