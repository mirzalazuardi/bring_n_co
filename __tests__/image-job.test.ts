import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    imageAsset: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { claimForProcessing, markFailed, resetForReprocess } from '@/lib/images/claim';
import { classifyError } from '@/lib/images/classify';
import { ImageValidationError } from '@/lib/images/process';

const updateMany = vi.mocked(prisma.imageAsset.updateMany);

beforeEach(() => {
  updateMany.mockReset();
});

describe('claimForProcessing', () => {
  it('claims a QUEUED image atomically', async () => {
    updateMany.mockResolvedValueOnce({ count: 1 });
    const result = await claimForProcessing('img-1', 'run-1');
    expect(result).toEqual({ outcome: 'claimed' });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'img-1', status: 'QUEUED' },
      data: { status: 'PROCESSING', jobRunId: 'run-1' },
    });
  });

  it('reclaims when PROCESSING with the same run id (retry after crash)', async () => {
    updateMany
      .mockResolvedValueOnce({ count: 0 }) // not QUEUED anymore
      .mockResolvedValueOnce({ count: 0 }) // not FAILED-by-this-run
      .mockResolvedValueOnce({ count: 1 }); // PROCESSING owned by this run
    const result = await claimForProcessing('img-1', 'run-1');
    expect(result).toEqual({ outcome: 'reclaimed' });
  });

  it('reclaims a FAILED image owned by the same run (transient retry)', async () => {
    updateMany
      .mockResolvedValueOnce({ count: 0 }) // not QUEUED
      .mockResolvedValueOnce({ count: 1 }); // FAILED by this run → back to PROCESSING
    const result = await claimForProcessing('img-1', 'run-1');
    expect(result).toEqual({ outcome: 'reclaimed' });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'img-1', status: 'FAILED', jobRunId: 'run-1' },
      data: { status: 'PROCESSING' },
    });
  });

  it('skips when another run owns the image', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    const result = await claimForProcessing('img-1', 'run-2');
    expect(result).toEqual({ outcome: 'skip' });
    expect(updateMany).toHaveBeenCalledTimes(3);
  });
});

describe('resetForReprocess', () => {
  it('resets only FAILED images', async () => {
    updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await resetForReprocess('img-1')).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'img-1', status: 'FAILED' },
      }),
    );
  });

  it('refuses non-FAILED images', async () => {
    updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await resetForReprocess('img-1')).toBe(false);
  });
});

describe('markFailed', () => {
  it('writes FAILED with category and user-safe message', async () => {
    updateMany.mockResolvedValueOnce({ count: 1 });
    await markFailed('img-1', 'UNSUPPORTED_FORMAT', 'Unsupported format.', 'run-1');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: {
        status: 'FAILED',
        errorCategory: 'UNSUPPORTED_FORMAT',
        errorMessage: 'Unsupported format.',
        jobRunId: 'run-1',
      },
    });
  });
});

describe('classifyError', () => {
  it('passes through ImageValidationError categories', () => {
    const err = new ImageValidationError('INVALID_FILE', 'corrupt');
    expect(classifyError(err)).toEqual({ category: 'INVALID_FILE', message: 'corrupt' });
  });

  it('maps unknown errors to UNKNOWN with a user-safe message', () => {
    const result = classifyError(new Error('prisma: connection refused at 10.0.0.1'));
    expect(result.category).toBe('UNKNOWN');
    expect(result.message).not.toContain('10.0.0.1');
  });

  it('respects pre-classified plain objects', () => {
    expect(classifyError({ category: 'STORAGE_FAILED', message: 'blob down' })).toEqual({
      category: 'STORAGE_FAILED',
      message: 'blob down',
    });
  });
});
