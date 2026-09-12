import { describe, it, expect, vi, afterEach } from 'vitest';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import {
  buildVariants,
  detectImageFormat,
  downloadWithLimit,
  ImageValidationError,
} from '../lib/images/process';
import { originalKey, variantKey } from '../lib/images/keys';
import {
  imageStatusResponseSchema,
  uploadRequestSchema,
} from '../lib/images/schemas';

/** 600x300 landscape JPEG carrying EXIF orientation 6 (rotate 90° CW → viewer sees 300x600). */
async function exifRotatedFixture(): Promise<Buffer> {
  return readFile(new URL('./fixtures/exif-rotated-600x300.jpg', import.meta.url), {
    encoding: null,
  });
}

async function jpegBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 90, g: 168, b: 132 } },
  })
    .jpeg()
    .toBuffer();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('storage keys', () => {
  it('builds deterministic keys without user filenames', () => {
    expect(originalKey('abc-123')).toBe('images/abc-123/original');
    expect(variantKey('abc-123', 'thumbnail')).toBe('images/abc-123/thumbnail.webp');
    expect(variantKey('abc-123', 'medium')).toBe('images/abc-123/medium.webp');
    expect(variantKey('abc-123', 'large')).toBe('images/abc-123/large.webp');
  });
});

describe('schemas', () => {
  it('accepts a valid upload request', () => {
    const parsed = uploadRequestSchema.safeParse({
      filename: 'reunion.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a non-uuid image id param', () => {
    const parsed = uploadRequestSchema.safeParse({ filename: '', size: -1, mimeType: '' });
    expect(parsed.success).toBe(false);
  });

  it('status response only allows public statuses', () => {
    const ok = imageStatusResponseSchema.safeParse({ id: crypto.randomUUID(), status: 'queued' });
    expect(ok.success).toBe(true);
    const bad = imageStatusResponseSchema.safeParse({ id: crypto.randomUUID(), status: 'QUEUED' });
    expect(bad.success).toBe(false);
  });
});

describe('detectImageFormat', () => {
  it('detects jpeg from bytes', async () => {
    const buf = await jpegBuffer(64, 48);
    const detected = await detectImageFormat(buf, 'image/jpeg');
    expect(detected.format).toBe('jpeg');
    expect(detected.width).toBe(64);
  });

  it('rejects declared-vs-detected mismatch', async () => {
    const buf = await jpegBuffer(64, 48);
    await expect(detectImageFormat(buf, 'image/png')).rejects.toMatchObject({
      name: 'ImageValidationError',
      category: 'UNSUPPORTED_FORMAT',
    });
  });

  it('rejects corrupt data as INVALID_FILE', async () => {
    const corrupt = Buffer.from([0xff, 0xd8, 0xff, 0x00, 'garbage'.charCodeAt(0)]);
    await expect(detectImageFormat(corrupt)).rejects.toMatchObject({
      category: 'INVALID_FILE',
    });
  });

  it('rejects svg content as UNSUPPORTED_FORMAT', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
    );
    await expect(detectImageFormat(svg, 'image/svg+xml')).rejects.toMatchObject({
      category: 'UNSUPPORTED_FORMAT',
    });
  });
});

describe('buildVariants', () => {
  it('generates webp variants respecting caps', async () => {
    const buf = await jpegBuffer(2000, 1200);
    const { source, variants } = await buildVariants(buf);
    expect(source.width).toBe(2000);
    expect(variants.thumbnail?.width).toBe(320);
    expect(variants.medium?.width).toBe(768);
    expect(variants.large?.width).toBe(1440);
    for (const v of Object.values(variants)) {
      expect(v).toBeDefined();
      const meta = await sharp(v!.buffer).metadata();
      expect(meta.format).toBe('webp');
    }
    // aspect preserved
    const large = await sharp(variants.large!.buffer).metadata();
    expect(large.height).toBe(Math.round((1200 / 2000) * 1440));
  });

  it('never enlarges smaller sources and omits larger caps', async () => {
    const buf = await jpegBuffer(200, 100);
    const { variants } = await buildVariants(buf);
    expect(variants.thumbnail).toBeDefined();
    expect(variants.medium).toBeUndefined();
    expect(variants.large).toBeUndefined();
    const meta = await sharp(variants.thumbnail!.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it('bakes exif orientation into pixel dimensions', async () => {
    const withExif = await exifRotatedFixture();

    const { source, variants } = await buildVariants(withExif);
    // source dims are post-rotate (what viewers see): 600x300 + orient 6 → 300x600
    expect(source.width).toBe(300);
    expect(source.height).toBe(600);
    const thumb = await sharp(variants.thumbnail!.buffer).metadata();
    expect(thumb.format).toBe('webp');
    expect(thumb.width).toBe(300);
    expect(thumb.height).toBe(600);
  });

  it('strips exif metadata from variants', async () => {
    const withExif = await exifRotatedFixture();

    const { variants } = await buildVariants(withExif);
    const meta = await sharp(variants.thumbnail!.buffer).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it('handles gif as a static image', async () => {
    const gif = await sharp({
      create: { width: 500, height: 500, channels: 3, background: { r: 9, g: 9, b: 9 } },
    })
      .gif()
      .toBuffer();
    const { source, variants } = await buildVariants(gif);
    expect(source.format).toBe('gif');
    expect(variants.thumbnail?.width).toBe(320); // down-scaled to thumbnail cap
    expect(variants.thumbnail?.height).toBe(320);
  });
});

describe('downloadWithLimit', () => {
  function bufferResponse(body: Buffer, withLength = true): Response {
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: withLength ? { 'content-length': String(body.byteLength) } : {},
    });
  }

  it('returns the body under the cap', async () => {
    const body = Buffer.alloc(1024, 7);
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(bufferResponse(body));
    const out = await downloadWithLimit('https://blob.example/x', 10 * 1024);
    expect(out.byteLength).toBe(1024);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('rejects bodies exceeding the cap and aborts the stream', async () => {
    const body = Buffer.alloc(10 * 1024, 1);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(bufferResponse(body, false));
    await expect(downloadWithLimit('https://blob.example/x', 1024)).rejects.toMatchObject({
      category: 'FILE_TOO_LARGE',
    });
  });

  it('classifies network failure as DOWNLOAD_FAILED', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'));
    await expect(downloadWithLimit('https://blob.example/x')).rejects.toMatchObject({
      category: 'DOWNLOAD_FAILED',
    });
  });

  it('classifies non-2xx as DOWNLOAD_FAILED', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('nope', { status: 404 }),
    );
    await expect(downloadWithLimit('https://blob.example/x')).rejects.toMatchObject({
      category: 'DOWNLOAD_FAILED',
    });
  });
});
