import { prisma } from '@/lib/prisma';
import { prizeNameSchema } from '@/lib/validations/doorprize';

/**
 * Doorprize wheel service (see openspec/changes/feat-doorprize-wheel).
 * Pure helpers (eligibility, uniform pick) are unit-tested; DB helpers accept
 * the prisma client/transaction as a parameter (DIP) so the routes stay thin.
 *
 * Result contracts are discriminated unions so API routes can map them to
 * status codes without guessing.
 */

export const VERIFIED_STATUS = 'APPROVED' as const;

export interface WheelCandidate {
  id: string;
  name: string | null;
  registration: { status: string } | null;
}

/** A user is wheel-eligible only with an APPROVED registration (REQ-DW-001). */
export function isVerifiedCandidate(user: WheelCandidate): boolean {
  return user.registration?.status === VERIFIED_STATUS;
}

/** Filter a candidate list down to APPROVED registrants. Runtime-guarded. */
export function filterVerifiedCandidates(users: WheelCandidate[]): WheelCandidate[] {
  if (!Array.isArray(users)) {
    throw new TypeError('filterVerifiedCandidates expects an array of users');
  }
  return users.filter(isVerifiedCandidate);
}

/**
 * Uniform random pick among remaining wheel participants. The random source is
 * injectable (DIP) so tests can pin outcomes; the drawn participant row is
 * deleted by the caller, so past winners are structurally ineligible.
 */
export function pickWinnerId(
  participantUserIds: string[],
  random: () => number = Math.random,
): string | null {
  if (!Array.isArray(participantUserIds) || participantUserIds.length === 0) {
    return null;
  }
  const index = Math.floor(random() * participantUserIds.length);
  return participantUserIds[Math.min(index, participantUserIds.length - 1)];
}

export interface CandidatePick {
  ok: true;
  candidates: { id: string; name: string | null }[];
}
export interface CandidatePickFailure {
  ok: false;
  error: string;
}

/**
 * Eligible add-list + wheel state for the picker UI: users with APPROVED
 * registrations who are NOT already on the wheel.
 */
export async function listEligibleCandidates(client = prisma): Promise<CandidatePick | CandidatePickFailure> {
  try {
    const users = await client.user.findMany({
      where: { registration: { status: VERIFIED_STATUS } },
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    const onWheel = new Set(
      (await client.wheelParticipant.findMany({ select: { userId: true } })).map((p) => p.userId),
    );
    return {
      ok: true,
      candidates: users
        .filter((u) => !onWheel.has(u.id))
        .map((u) => ({ id: u.id, name: u.name ?? u.id })),
    };
  } catch (error) {
    console.error('[doorprize] listEligibleCandidates failed', error);
    return { ok: false, error: 'Gagal memuat daftar peserta' };
  }
}

export interface PrizeCreated {
  ok: true;
  prize: { id: string; name: string };
}
export interface PrizeFailure {
  ok: false;
  error: string;
  status: 400 | 409 | 500;
}

/** Create a prize from validated input (REQ-DW-002). */
export async function createPrize(
  rawName: unknown,
  client = prisma,
): Promise<PrizeCreated | PrizeFailure> {
  const parsed = prizeNameSchema.safeParse(rawName);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Nama hadiah tidak valid', status: 400 };
  }
  try {
    const prize = await client.wheelPrize.create({ data: { name: parsed.data } });
    return { ok: true, prize: { id: prize.id, name: prize.name } };
  } catch (error) {
    console.error('[doorprize] createPrize failed', error);
    return { ok: false, error: 'Gagal menambah hadiah', status: 500 };
  }
}

/** Delete a prize; drawn prizes are protected by the Restrict FK (REQ-DW-002). */
export async function deletePrize(
  prizeId: string,
  client = prisma,
): Promise<{ ok: true } | PrizeFailure> {
  try {
    await client.wheelPrize.delete({ where: { id: prizeId } });
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Object &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) {
      return { ok: false, error: 'Hadiah tidak ditemukan', status: 404 as 400 | 409 | 500 };
    }
    if (
      error instanceof Object &&
      'code' in error &&
      (error as { code?: string }).code === 'P2003'
    ) {
      // FK restrict: the prize already has draws recorded.
      return { ok: false, error: 'Hadiah sudah pernah diundi dan tidak dapat dihapus', status: 409 };
    }
    console.error('[doorprize] deletePrize failed', error);
    return { ok: false, error: 'Gagal menghapus hadiah', status: 500 };
  }
}

export interface AddParticipantOk {
  ok: true;
  participant: { id: string; userId: string };
}
export interface AddParticipantFailure {
  ok: false;
  error: string;
  status: 400 | 404 | 409 | 500;
}

/**
 * Add a participant after re-verifying on the server that the user's
 * registration is APPROVED (REQ-DW-001 — never trust the client list).
 */
export async function addParticipant(
  userId: string,
  client = prisma,
): Promise<AddParticipantOk | AddParticipantFailure> {
  if (!userId || typeof userId !== 'string') {
    return { ok: false, error: 'userId wajib diisi', status: 400 };
  }
  try {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { id: true, registration: { select: { status: true } } },
    });
    if (!user) {
      return { ok: false, error: 'User tidak ditemukan', status: 404 };
    }
    if (!isVerifiedCandidate(user)) {
      return { ok: false, error: 'Hanya alumni dengan pendaftaran terverifikasi yang bisa ikut undian', status: 400 };
    }
    const participant = await client.wheelParticipant.create({ data: { userId } });
    return { ok: true, participant: { id: participant.id, userId: participant.userId } };
  } catch (error) {
    if (
      error instanceof Object &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return { ok: false, error: 'Peserta sudah ada di wheel', status: 409 };
    }
    console.error('[doorprize] addParticipant failed', error);
    return { ok: false, error: 'Gagal menambah peserta', status: 500 };
  }
}

/** Remove a participant who has not won (admin cleanup, REQ-DW-001). */
export async function removeParticipant(
  participantId: string,
  client = prisma,
): Promise<{ ok: true } | { ok: false; error: string; status: 404 | 500 }> {
  try {
    await client.wheelParticipant.delete({ where: { id: participantId } });
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Object &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) {
      return { ok: false, error: 'Peserta tidak ditemukan', status: 404 };
    }
    console.error('[doorprize] removeParticipant failed', error);
    return { ok: false, error: 'Gagal menghapus peserta', status: 500 };
  }
}

export interface DrawRecord {
  id: string;
  prizeId: string;
  prizeName: string;
  userId: string;
  userName: string | null;
  drawnAt: Date;
}

export interface SpinOk {
  ok: true;
  winner: { userId: string; userName: string | null };
  prize: { id: string; name: string };
  draw: DrawRecord;
}
export interface SpinFailure {
  ok: false;
  error: string;
  status: 400 | 404 | 409 | 500;
}

interface SpinPrismaLike {
  wheelParticipant: {
    findMany(args: { select: { userId: boolean } }): Promise<{ userId: string }[]>;
  };
  user: {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true; name: boolean };
    }): Promise<{ id: string; name: string | null }[]>;
  };
}

/**
 * One spin = one transaction (REQ-DW-003): pick a uniformly random remaining
 * participant, create the immutable draw, delete the participant row.
 * If any step fails nothing is written, so the wheel can never show a winner
 * who is still on it, or record two wins for one person.
 */
export async function spinWheel(
  prizeId: string,
  random: () => number = Math.random,
  client = prisma,
  txLike?: SpinPrismaLike,
): Promise<SpinOk | SpinFailure> {
  if (!prizeId || typeof prizeId !== 'string') {
    return { ok: false, error: 'Pilih hadiah terlebih dahulu', status: 400 };
  }
  try {
    const prize = await client.wheelPrize.findUnique({ where: { id: prizeId } });
    if (!prize) {
      return { ok: false, error: 'Hadiah tidak ditemukan', status: 404 };
    }

    const draw = await client.$transaction(async (tx) => {
      const participants = await (txLike ?? tx).wheelParticipant.findMany({
        select: { userId: true },
      });
      const userIds = participants.map((p) => p.userId);
      const winnerUserId = pickWinnerId(userIds, random);
      if (winnerUserId === null) {
        return null; // empty wheel — nothing written
      }

      const names = await (txLike ?? tx).user.findMany({
        where: { id: { in: [winnerUserId] } },
        select: { id: true, name: true },
      });
      const winnerName = names[0]?.name ?? null;

      const created = await tx.wheelDraw.create({
        data: { prizeId, userId: winnerUserId },
      });
      await tx.wheelParticipant.delete({ where: { userId: winnerUserId } });

      return {
        id: created.id,
        prizeId,
        prizeName: prize.name,
        userId: winnerUserId,
        userName: winnerName,
        drawnAt: created.drawnAt,
      };
    });

    if (draw === null) {
      return { ok: false, error: 'Wheel kosong — tambahkan peserta terlebih dahulu', status: 400 };
    }
    return {
      ok: true,
      winner: { userId: draw.userId, userName: draw.userName },
      prize: { id: prize.id, name: prize.name },
      draw,
    };
  } catch (error) {
    console.error('[doorprize] spinWheel failed', error);
    return { ok: false, error: 'Gagal mengundi', status: 500 };
  }
}

export interface WheelSnapshotOk {
  ok: true;
  participants: { id: string; userId: string; name: string | null }[];
  prizes: { id: string; name: string; drawn: boolean }[];
  draws: DrawRecord[];
}
export interface WheelSnapshotFailure {
  ok: false;
  error: string;
}

/**
 * Full admin snapshot: wheel segments (participants), prize list with a
 * `drawn` flag for delete-protection UI, and draw history (newest first).
 */
export async function getWheelSnapshot(client = prisma): Promise<WheelSnapshotOk | WheelSnapshotFailure> {
  try {
    const [participants, prizes, drawsRaw] = await Promise.all([
      client.wheelParticipant.findMany({
        select: { id: true, userId: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      client.wheelPrize.findMany({
        select: { id: true, name: true, draws: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      client.wheelDraw.findMany({
        select: {
          id: true,
          prizeId: true,
          prize: { select: { name: true } },
          userId: true,
          user: { select: { name: true } },
          drawnAt: true,
        },
        orderBy: { drawnAt: 'desc' },
        take: 200,
      }),
    ]);
    return {
      ok: true,
      participants: participants.map((p) => ({ id: p.id, userId: p.userId, name: p.user.name })),
      prizes: prizes.map((p) => ({ id: p.id, name: p.name, drawn: p.draws.length > 0 })),
      draws: drawsRaw.map((d) => ({
        id: d.id,
        prizeId: d.prizeId,
        prizeName: d.prize.name,
        userId: d.userId,
        userName: d.user.name,
        drawnAt: d.drawnAt,
      })),
    };
  } catch (error) {
    console.error('[doorprize] getWheelSnapshot failed', error);
    return { ok: false, error: 'Gagal memuat data wheel' };
  }
}

/**
 * Reset for pre-event testing (REQ-DW-004): clear draws + participants in one
 * transaction; prize definitions survive so the live round reuses them.
 */
export async function resetWheel(
  client = prisma,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await client.$transaction(async (tx) => {
      await tx.wheelDraw.deleteMany({});
      await tx.wheelParticipant.deleteMany({});
    });
    return { ok: true };
  } catch (error) {
    console.error('[doorprize] resetWheel failed', error);
    return { ok: false, error: 'Gagal mereset wheel' };
  }
}
