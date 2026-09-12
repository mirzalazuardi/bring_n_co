import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    imageAsset: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock('@trigger.dev/sdk', () => ({
  tasks: { trigger: vi.fn().mockResolvedValue({ id: 'run-123' }) },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { tasks } from '@trigger.dev/sdk';
import { GET as getStatus } from '../app/api/images/[id]/route';
import { POST as reprocess } from '../app/api/images/[id]/reprocess/route';

const getSession = vi.mocked(getServerSession);
const findUnique = vi.mocked(prisma.imageAsset.findUnique);
const trigger = vi.mocked(tasks.trigger);

const UUID = '11111111-1111-4111-8111-111111111111';
const USER = 'user-1';

function authed(value: boolean) {
  getSession.mockResolvedValue(
    value ? ({ user: { id: USER } } as never) : null,
  );
}

function routeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  getSession.mockReset();
  findUnique.mockReset();
  trigger.mockClear();
});

describe('GET /api/images/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    authed(false);
    const res = await getStatus(new Request('http://x'), routeCtx(UUID));
    expect(res.status).toBe(401);
  });

  it('returns 404 for malformed id without touching the db', async () => {
    authed(true);
    const res = await getStatus(new Request('http://x'), routeCtx('not-a-uuid'));
    expect(res.status).toBe(404);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for another user’s image (no existence leak)', async () => {
    authed(true);
    findUnique.mockResolvedValueOnce({
      id: UUID,
      userId: 'someone-else',
      status: 'COMPLETED',
      errorCategory: null,
      errorMessage: null,
      variants: null,
    } as never);
    const res = await getStatus(new Request('http://x'), routeCtx(UUID));
    expect(res.status).toBe(404);
  });

  it('returns normalized status for the owner', async () => {
    authed(true);
    findUnique.mockResolvedValueOnce({
      id: UUID,
      userId: USER,
      status: 'FAILED',
      errorCategory: 'UNSUPPORTED_FORMAT',
      errorMessage: 'Unsupported format.',
      variants: null,
    } as never);
    const res = await getStatus(new Request('http://x'), routeCtx(UUID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ id: UUID, status: 'failed', errorCategory: 'UNSUPPORTED_FORMAT' });
  });
});

describe('POST /api/images/:id/reprocess', () => {
  it('returns 401 when unauthenticated', async () => {
    authed(false);
    const res = await reprocess(new Request('http://x', { method: 'POST' }), routeCtx(UUID));
    expect(res.status).toBe(401);
  });

  it('returns 404 for foreign images', async () => {
    authed(true);
    findUnique.mockResolvedValueOnce({ id: UUID, userId: 'other' } as never);
    const res = await reprocess(new Request('http://x', { method: 'POST' }), routeCtx(UUID));
    expect(res.status).toBe(404);
    expect(trigger).not.toHaveBeenCalled();
  });

  it('queues reprocess for a failed image and returns 202', async () => {
    authed(true);
    findUnique.mockResolvedValueOnce({ id: UUID, userId: USER } as never);
    // resetForReprocess goes through prisma.imageAsset.updateMany
    (prisma.imageAsset as unknown as { updateMany: ReturnType<typeof vi.fn> }).updateMany =
      vi.fn().mockResolvedValue({ count: 1 });
    const res = await reprocess(new Request('http://x', { method: 'POST' }), routeCtx(UUID));
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.data).toEqual({ id: UUID, status: 'queued' });
    expect(trigger).toHaveBeenCalledWith('optimize-image', { imageId: UUID });
  });

  it('returns 409 when the image is not FAILED', async () => {
    authed(true);
    findUnique.mockResolvedValueOnce({ id: UUID, userId: USER } as never);
    (prisma.imageAsset as unknown as { updateMany: ReturnType<typeof vi.fn> }).updateMany =
      vi.fn().mockResolvedValue({ count: 0 });
    const res = await reprocess(new Request('http://x', { method: 'POST' }), routeCtx(UUID));
    expect(res.status).toBe(409);
    expect(trigger).not.toHaveBeenCalled();
  });
});
