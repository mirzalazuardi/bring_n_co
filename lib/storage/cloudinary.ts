import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/lib/env';

/**
 * Cloudinary storage service — the single dependency boundary for all image
 * storage I/O (uploads, existence checks, deletion). Route handlers and
 * workers depend on these functions, never on the Cloudinary SDK directly,
 * so the backend stays swappable and unit tests can mock this module.
 *
 * Deterministic public_ids mirror the old Blob layout, minus extensions
 * (Cloudinary appends the detected format itself):
 *   original → images/{imageId}/original.jpg
 *   variant  → images/{imageId}/{variant}.webp
 */

/** Cloudinary public_id (extension-less) for a pipeline original. */
export function originalPublicId(imageId: string): string {
  return `images/${imageId}/original`;
}

/** Cloudinary public_id (extension-less) for a pipeline WebP variant. */
export function variantPublicId(imageId: string, variant: string): string {
  return `images/${imageId}/${variant}`;
}

const MIME_TO_CLOUDINARY_FORMAT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/tiff': 'tif',
};

/** Canonical MIME for a Cloudinary format (jpg→jpeg, tif→tiff; others pass through). */
function mimeFromFormat(format: string): string {
  if (format === 'jpg' || format === 'jpe') return 'image/jpeg';
  if (format === 'tif') return 'image/tiff';
  return `image/${format}`;
}

function isConfigured(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  );
}

/** Non-throwing credential gate for route handlers and delete flows. */
export function isStorageConfigured(): boolean {
  return isConfigured();
}

/**
 * Throws (route handlers map this to 503) unless all three credentials exist.
 */
export function assertCloudinaryConfigured(): void {
  if (!isConfigured()) {
    throw new Error('Image storage is not configured (CLOUDINARY_* env vars missing).');
  }
}

export interface StoredFile {
  /** Delivery URL of the stored asset. */
  url: string;
  /** Public ID assigned by Cloudinary (equals the requested id when deterministic). */
  publicId: string;
  /** MIME type of the stored asset. */
  contentType: string | null;
  /** Stored size in bytes, when reported. */
  bytes: number | null;
}

function configureClient() {
  assertCloudinaryConfigured();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Server-side upload of a File or buffer under a deterministic public_id. */
export async function putStorageFile(
  publicId: string,
  file: File | Buffer,
  options: { contentType?: string } = {},
): Promise<StoredFile> {
  configureClient();
  const bytes = file instanceof Buffer ? file : Buffer.from(await (file as File).arrayBuffer());
  const mime = options.contentType ?? 'application/octet-stream';
  const result = await cloudinary.uploader.upload(
    `data:${mime};base64,${bytes.toString('base64')}`,
    {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    },
  );
  return {
    url: result.secure_url,
    publicId: result.public_id,
    contentType:
      result.resource_type === 'image' ? mimeFromFormat(result.format) : null,
    bytes: result.bytes ?? null,
  };
}

/** Server-side delete of assets by public ID (not-found ids are tolerated). */
export async function deleteStorageFiles(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  configureClient();
  await cloudinary.api.delete_resources(publicIds);
}

/**
 * Authoritative existence + metadata check for a stored asset. Returns null
 * when the asset is missing (http_code 404); other errors propagate so route
 * handlers can map them to 503.
 */
export async function headStorageFile(publicId: string): Promise<StoredFile | null> {
  configureClient();
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: 'image' });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      contentType:
        result.resource_type === 'image' ? mimeFromFormat(result.format) : null,
      bytes: result.bytes ?? null,
    };
  } catch (error) {
    if ((error as { http_code?: number }).http_code === 404) {
      return null;
    }
    throw error;
  }
}

export interface DirectUploadParams {
  /** Canonical browser upload endpoint for image assets. */
  uploadUrl: string;
  /** Signed upload parameters the client must send alongside the file. */
  params: Record<string, string>;
  /** HMAC-SHA1 signature over `params` (+ api_secret), per Cloudinary. */
  signature: string;
  /** Unix seconds — signature validity window. */
  timestamp: string;
  apiKey: string;
  cloudName: string;
}

/**
 * Mint a short-lived signed direct-upload payload for browser → Cloudinary.
 * The client never sees the API secret. Every param sent by the client MUST
 * be part of the signature, so the client sends `params` + `signature` +
 * `apiKey` + `timestamp` + `file` — nothing else.
 *
 * The signature pins public_id, allowed formats, and max size, replacing the
 * old Blob token's allowedContentTypes/maximumSizeInBytes enforcement.
 */
export function createDirectUploadParams(input: {
  publicId: string;
  maxBytes: number;
  allowedMimeTypes: readonly string[];
  ttlSeconds?: number;
}): DirectUploadParams {
  configureClient();
  const timestamp = Math.floor(Date.now() / 1000 + (input.ttlSeconds ?? 300)).toString();
  const params: Record<string, string> = {
    allowed_formats: [
      ...new Set(
        input.allowedMimeTypes
          .map((m) => MIME_TO_CLOUDINARY_FORMAT[m.toLowerCase()])
          .filter((f): f is string => Boolean(f)),
      ),
    ].join(','),
    max_bytes: String(input.maxBytes),
    overwrite: 'true',
    public_id: input.publicId,
    timestamp,
  };
  const signature = cloudinary.utils.api_sign_request(
    params,
    env.CLOUDINARY_API_SECRET as string,
  );
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    params,
    signature,
    timestamp,
    apiKey: env.CLOUDINARY_API_KEY as string,
    cloudName: env.CLOUDINARY_CLOUD_NAME as string,
  };
}

/**
 * Extract a Cloudinary public_id from a canonical delivery URL:
 * res.cloudinary.com/{cloud}/{type}/upload/[v{N}/]{public_id}.{ext}
 * Returns null for anything else (e.g. legacy/mock URLs).
 */
export function publicIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'res.cloudinary.com') return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.indexOf('upload');
    if (uploadIndex === -1 || uploadIndex === segments.length - 1) return null;
    let publicId = segments.slice(uploadIndex + 1).join('/');
    // Strip an optional version segment (v1712345678) right after /upload/
    publicId = publicId.replace(/^v\d+\//, '');
    // Strip the format extension Cloudinary appended
    const lastSlash = publicId.lastIndexOf('/');
    const lastDot = publicId.lastIndexOf('.');
    if (lastDot > lastSlash + 1) {
      publicId = publicId.slice(0, lastDot);
    }
    return publicId || null;
  } catch {
    return null;
  }
}
