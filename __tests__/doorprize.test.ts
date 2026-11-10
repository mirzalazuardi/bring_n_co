import { describe, it, expect, vi } from 'vitest';

// The service module imports the prisma singleton at module scope; stub it so
// no real client / database is touched in unit tests.
vi.mock('@/lib/prisma', () => {
  const prisma = {};
  return { default: prisma, prisma };
});

import {
  prizeNameSchema,
  wheelUserIdSchema,
} from '../lib/validations/doorprize';
import {
  isVerifiedCandidate,
  filterVerifiedCandidates,
  pickWinnerId,
  addAllParticipants,
  removeAllParticipants,
  wheelOrder,
} from '../lib/admin/doorprize';

type DoorprizeClient = NonNullable<Parameters<typeof addAllParticipants>[0]>;

describe('doorprize payload schemas', () => {
  it('accepts trimmed prize names up to 120 chars', () => {
    const parsed = prizeNameSchema.safeParse('  Tumbler Silver  ');
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toBe('Tumbler Silver');
    expect(prizeNameSchema.safeParse('x'.repeat(120)).success).toBe(true);
  });

  it('rejects empty or oversized prize names', () => {
    expect(prizeNameSchema.safeParse('   ').success).toBe(false);
    expect(prizeNameSchema.safeParse('x'.repeat(121)).success).toBe(false);
  });

  it('rejects missing userId payloads', () => {
    expect(wheelUserIdSchema.safeParse({ userId: 'user_1' }).success).toBe(true);
    expect(wheelUserIdSchema.safeParse({ userId: '' }).success).toBe(false);
    expect(wheelUserIdSchema.safeParse({}).success).toBe(false);
  });
});

describe('verified-eligibility filter', () => {
  const approved = { id: 'u1', name: 'Andi', registration: { status: 'APPROVED' } };
  const pending = { id: 'u2', name: 'Budi', registration: { status: 'PENDING' } };
  const rejected = { id: 'u3', name: 'Cici', registration: { status: 'REJECTED' } };
  const unregistered = { id: 'u4', name: 'Dedi', registration: null };

  it('keeps only users with an APPROVED registration', () => {
    const users = [approved, pending, rejected, unregistered];
    expect(filterVerifiedCandidates(users).map((u) => u.id)).toEqual(['u1']);
    expect(isVerifiedCandidate(approved)).toBe(true);
    expect(isVerifiedCandidate(pending)).toBe(false);
    expect(isVerifiedCandidate(rejected)).toBe(false);
    expect(isVerifiedCandidate(unregistered)).toBe(false);
  });

  it('throws when input is not an array', () => {
    // @ts-expect-error runtime guard exercised intentionally
    expect(() => filterVerifiedCandidates(null)).toThrow();
  });
});

describe('bulk participant management', () => {
  it('adds only verified candidates that are not already on the wheel', async () => {
    const created: { userId: string }[] = [];
    const client = {
      user: {
        findMany: async () => [
          { id: 'u1', name: 'Andi' },
          { id: 'u2', name: 'Budi' },
          { id: 'u3', name: 'Cici' },
        ],
      },
      wheelParticipant: {
        findMany: async () => [{ userId: 'u2' }],
        createMany: async ({ data }: { data: { userId: string }[] }) => {
          created.push(...data);
          return { count: data.length };
        },
      },
    } as unknown as DoorprizeClient;

    await expect(addAllParticipants(client)).resolves.toEqual({ ok: true, added: 2, total: 2 });
    expect(created.map((c) => c.userId)).toEqual(['u1', 'u3']);
  });

  it('is a no-op when every verified candidate is already on the wheel', async () => {
    const client = {
      user: { findMany: async () => [{ id: 'u1', name: 'Andi' }] },
      wheelParticipant: {
        findMany: async () => [{ userId: 'u1' }],
        createMany: async () => {
          throw new Error('createMany must not run');
        },
      },
    } as unknown as DoorprizeClient;

    await expect(addAllParticipants(client)).resolves.toEqual({ ok: true, added: 0, total: 0 });
  });

  it('removes every participant in one sweep', async () => {
    const client = {
      wheelParticipant: {
        deleteMany: async () => ({ count: 145 }),
      },
    } as unknown as DoorprizeClient;

    await expect(removeAllParticipants(client)).resolves.toEqual({ ok: true, removed: 145 });
  });
});

describe('wheel segment order', () => {
  const participants = Array.from({ length: 145 }, (_, i) => ({
    userId: `user_${String(i).padStart(3, '0')}`,
    name: `Nama ${String(i).padStart(3, '0')}`,
  }));

  it('is deterministic and independent of the input order', () => {
    const forward = wheelOrder(participants).map((p) => p.userId);
    const reversed = wheelOrder([...participants].reverse()).map((p) => p.userId);
    expect(forward).toEqual(reversed);
    expect(new Set(forward).size).toBe(participants.length);
  });

  it('is not alphabetical by name', () => {
    const names = wheelOrder(participants).map((p) => p.name);
    const alphabetical = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).not.toEqual(alphabetical);
  });

  it('keeps the surviving order when one participant leaves', () => {
    const before = wheelOrder(participants).map((p) => p.userId);
    const after = wheelOrder(participants.filter((p) => p.userId !== 'user_042')).map((p) => p.userId);
    expect(after).toEqual(before.filter((id) => id !== 'user_042'));
  });
});

describe('pickWinnerId', () => {
  const ids = ['a', 'b', 'c'];

  it('returns null on an empty wheel', () => {
    expect(pickWinnerId([], Math.random)).toBeNull();
  });

  it('maps the injected random uniformly across segments', () => {
    expect(pickWinnerId(ids, () => 0)).toBe('a');
    expect(pickWinnerId(ids, () => 0.4)).toBe('b');
    expect(pickWinnerId(ids, () => 0.7)).toBe('c');
    expect(pickWinnerId(ids, () => 0.999999)).toBe('c');
  });

  it('never returns an id outside the wheel', () => {
    for (let i = 0; i < 100; i++) {
      expect(ids).toContain(pickWinnerId(ids, Math.random));
    }
  });
});
