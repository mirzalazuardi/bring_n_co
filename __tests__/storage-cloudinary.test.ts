import { describe, it, expect, vi, beforeEach } from 'vitest';

const cloudinaryMock = vi.hoisted(() => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload: vi.fn(),
    },
    api: {
      resource: vi.fn(),
      delete_resources: vi.fn(),
    },
    utils: {
      api_sign_request: vi.fn(),
    },
  },
}));

vi.mock('cloudinary', () => cloudinaryMock);

vi.mock('@/lib/env', () => ({
  env: {
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  },
}));

import {
  originalPublicId,
  variantPublicId,
  putStorageFile,
  deleteStorageFiles,
  headStorageFile,
  createDirectUploadParams,
  publicIdFromUrl,
} from '../lib/storage/cloudinary';

const c = cloudinaryMock.v2;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('deterministic public ids', () => {
  it('mirrors the legacy Blob key layout (extension-less)', () => {
    expect(originalPublicId('abc-123')).toBe('images/abc-123/original');
    expect(variantPublicId('abc-123', 'thumbnail')).toBe('images/abc-123/thumbnail');
  });
});

describe('putStorageFile', () => {
  it('uploads a Buffer as a data URI with overwrite + deterministic public_id', async () => {
    c.uploader.upload.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/images/x/original.jpg',
      public_id: 'images/x/original',
      resource_type: 'image',
      format: 'jpg',
      bytes: 4321,
    });

    const stored = await putStorageFile('images/x/original', Buffer.from('abc'), {
      contentType: 'image/jpeg',
    });

    expect(c.uploader.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/jpeg;base64,/),
      expect.objectContaining({
        public_id: 'images/x/original',
        overwrite: true,
        resource_type: 'image',
      }),
    );
    expect(stored).toEqual({
      url: 'https://res.cloudinary.com/test-cloud/image/upload/images/x/original.jpg',
      publicId: 'images/x/original',
      contentType: 'image/jpeg',
      bytes: 4321,
    });
  });

  it('accepts a File input', async () => {
    c.uploader.upload.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/gallery/a.png',
      public_id: 'gallery/a',
      resource_type: 'image',
      format: 'png',
      bytes: 10,
    });
    const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' });
    const stored = await putStorageFile('gallery/a', file, { contentType: 'image/png' });
    expect(stored.publicId).toBe('gallery/a');
  });
});

describe('deleteStorageFiles', () => {
  it('calls delete_resources with the given public ids', async () => {
    await deleteStorageFiles(['a', 'b']);
    expect(c.api.delete_resources).toHaveBeenCalledWith(['a', 'b']);
  });

  it('is a no-op for an empty list', async () => {
    await deleteStorageFiles([]);
    expect(c.api.delete_resources).not.toHaveBeenCalled();
  });
});

describe('headStorageFile', () => {
  it('maps a missing asset (http_code 404) to null', async () => {
    c.api.resource.mockRejectedValue(
      Object.assign(new Error('not found'), { http_code: 404 }),
    );
    expect(await headStorageFile('images/x/original')).toBeNull();
  });

  it('returns stored metadata on success', async () => {
    c.api.resource.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/images/x/original.jpg',
      public_id: 'images/x/original',
      resource_type: 'image',
      format: 'jpg',
      bytes: 99,
    });
    const stored = await headStorageFile('images/x/original');
    expect(stored?.url).toContain('original.jpg');
    expect(stored?.contentType).toBe('image/jpeg');
  });

  it('propagates non-404 errors', async () => {
    c.api.resource.mockRejectedValue(
      Object.assign(new Error('auth failed'), { http_code: 401 }),
    );
    await expect(headStorageFile('images/x/original')).rejects.toThrow('auth failed');
  });
});

describe('createDirectUploadParams', () => {
  it('pins public_id, formats, and max size into the signed params', () => {
    c.utils.api_sign_request.mockReturnValue('sig-1');
    const params = createDirectUploadParams({
      publicId: 'images/abc/original',
      maxBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff'],
    });

    expect(params.uploadUrl).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
    expect(params.params.public_id).toBe('images/abc/original');
    expect(params.params.max_bytes).toBe(String(10 * 1024 * 1024));
    expect(params.params.allowed_formats).toBe('jpg,png,webp,gif,avif,tif');
    expect(params.params.overwrite).toBe('true');
    expect(params.signature).toBe('sig-1');
    expect(c.utils.api_sign_request).toHaveBeenCalledWith(
      expect.objectContaining({ public_id: 'images/abc/original' }),
      'test-secret',
    );
  });
});

describe('publicIdFromUrl', () => {
  it('parses canonical delivery URLs', () => {
    expect(publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/images/x/original.jpg')).toBe(
      'images/x/original',
    );
  });

  it('strips an optional version segment', () => {
    expect(
      publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/v1712345678/images/x/medium.webp'),
    ).toBe('images/x/medium');
  });

  it('handles multi-segment public ids and nested folders', () => {
    expect(publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/a/b/c.png')).toBe('a/b/c');
  });

  it('returns null for non-Cloudinary or malformed URLs', () => {
    expect(publicIdFromUrl('https://mock.res.cloudinary.com/image/upload/x.jpg')).toBeNull();
    expect(publicIdFromUrl('https://example.com/image/upload/x.jpg')).toBeNull();
    expect(publicIdFromUrl('not a url')).toBeNull();
  });
});
