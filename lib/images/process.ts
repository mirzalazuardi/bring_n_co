import sharp from 'sharp';
import type { Metadata } from 'sharp';
import { env } from '@/lib/env';
import { PERMANENT_ERROR_CATEGORIES, type ErrorCategory, type VariantName } from '@/lib/images/schemas';

/** Accepted source formats, by Sharp-detected format id. SVG is deliberately excluded. */
export const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff'] as const;
export type AcceptedFormat = (typeof ACCEPTED_FORMATS)[number];

/** Declared client MIME types mapped to expected Sharp format ids. */
const MIME_TO_FORMAT: Record<string, AcceptedFormat> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/tiff': 'tiff',
};

export const ACCEPTED_MIME_TYPES = Object.keys(MIME_TO_FORMAT);

export class ImageValidationError extends Error {
  readonly category: ErrorCategory;

  constructor(category: ErrorCategory, message: string) {
    super(message);
    this.name = 'ImageValidationError';
    this.category = category;
  }

  get isPermanent(): boolean {
    return PERMANENT_ERROR_CATEGORIES.includes(this.category);
  }
}

export interface DetectedImage {
  format: AcceptedFormat;
  width: number;
  height: number;
  orientation?: number;
}

/**
 * Detects the true image format from bytes via libvips (magic-byte truth,
 * not client MIME). Rejects unsupported formats, SVG, and declared-vs-
 * detected mismatches; classifies corrupt data.
 */
export async function detectImageFormat(
  buffer: Buffer,
  declaredMime?: string,
): Promise<DetectedImage> {
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new ImageValidationError('INVALID_FILE', 'The image file is corrupt or unreadable.');
  }

  const format = metadata.format;
  if (!format || !ACCEPTED_FORMATS.includes(format as AcceptedFormat)) {
    throw new ImageValidationError(
      'UNSUPPORTED_FORMAT',
      declaredMime
        ? 'The file content does not match its declared type or is not a supported image format.'
        : 'The file is not a supported image format.',
    );
  }

  if (declaredMime) {
    const expected = MIME_TO_FORMAT[declaredMime.toLowerCase()];
    if (expected && expected !== format) {
      throw new ImageValidationError(
        'UNSUPPORTED_FORMAT',
        'The file content does not match its declared type.',
      );
    }
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width <= 0 || height <= 0) {
    throw new ImageValidationError('INVALID_FILE', 'The image has no valid dimensions.');
  }

  return { format: format as AcceptedFormat, width, height, orientation: metadata.orientation };
}

export interface VariantInput {
  buffer: Buffer;
  width: number;
  height: number;
}

export function variantMaxWidth(variant: VariantName): number {
  switch (variant) {
    case 'thumbnail':
      return 320;
    case 'medium':
      return 768;
    case 'large':
      return env.IMAGE_PROCESSING_MAX_WIDTH;
  }
}

/**
 * Builds WebP variants per spec: EXIF orientation baked via `.rotate()`,
 * aspect ratio preserved, never enlarged, quality 82, metadata stripped.
 * Variants whose cap exceeds the source width are omitted entirely.
 * Thumbnail is always emitted (down-scaled or 1:1), so tiny images still
 * get a normalized WebP for the gallery.
 */
export async function buildVariants(buffer: Buffer): Promise<{
  source: DetectedImage;
  variants: Partial<Record<VariantName, VariantInput>>;
}> {
  const detected = await detectImageFormat(buffer);

  // Compute post-rotate dimensions ourselves: sharp's withoutEnlargement
  // compares against PRE-rotate dimensions, which can silently upscale the
  // narrow side of EXIF-rotated portraits (e.g. 300w → 320w).
  const rotated = (detected.orientation ?? 1) >= 5; // orientations 5-8 swap width/height
  const source: DetectedImage = {
    format: detected.format,
    width: rotated ? detected.height : detected.width,
    height: rotated ? detected.width : detected.height,
  };

  const pipelineFor = (maxWidth: number) =>
    sharp(buffer)
      .rotate() // bake EXIF orientation into pixels
      .resize({
        width: Math.min(maxWidth, source.width),
        withoutEnlargement: true,
      })
      // Sharp strips EXIF/GPS/metadata by default (no .withMetadata call)
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

  const ordered: VariantName[] = ['thumbnail', 'medium', 'large'];
  const variants: Partial<Record<VariantName, VariantInput>> = {};

  for (const name of ordered) {
    const cap = variantMaxWidth(name);
    if (cap > source.width && name !== 'thumbnail') continue;
    const { data, info } = await pipelineFor(Math.min(cap, source.width));
    variants[name] = { buffer: data, width: info.width, height: info.height };
  }

  return { source, variants };
}

const MAX_RESPONSE_BYTES = Math.ceil(env.MAX_IMAGE_SIZE_MB * 1024 * 1024 * 1.1); // +10% encoding headroom

/**
 * Downloads a stored Blob URL with a hard byte cap (never a user-supplied
 * URL — callers pass keys/URLs we generated). Aborts as soon as the cap is
 * exceeded so an oversized body can't exhaust worker memory.
 */
export async function downloadWithLimit(url: string, maxBytes = MAX_RESPONSE_BYTES): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new ImageValidationError('DOWNLOAD_FAILED', 'Could not download the original image.');
  }

  if (!response.ok || !response.body) {
    throw new ImageValidationError('DOWNLOAD_FAILED', `Download failed with status ${response.status}.`);
  }

  const declaredLength = Number(response.headers.get('content-length') ?? '0');
  if (declaredLength > maxBytes) {
    throw new ImageValidationError('FILE_TOO_LARGE', 'The image exceeds the maximum allowed size.');
  }

  const chunks: Buffer[] = [];
  let received = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new ImageValidationError('FILE_TOO_LARGE', 'The image exceeds the maximum allowed size.');
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}
