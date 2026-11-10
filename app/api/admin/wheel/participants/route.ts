import { addParticipant, listEligibleCandidates, removeAllParticipants } from '@/lib/admin/doorprize';
import { wheelUserIdSchema } from '@/lib/validations/doorprize';
import { requireAdmin } from '@/lib/admin/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/wheel/participants — eligible picker list: users with an
 * APPROVED registration who are not already on the wheel (REQ-DW-001).
 */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const result = await listEligibleCandidates();
  if (!result.ok) {
    return Response.json({ success: false, error: result.error }, { status: 500 });
  }
  return Response.json({ success: true, data: result.candidates });
}

/** POST /api/admin/wheel/participants — add a verified registrant to the wheel. */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = wheelUserIdSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const result = await addParticipant(parsed.data.userId);
  if (!result.ok) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }
  return Response.json({ success: true, data: result.participant }, { status: 201 });
}

/**
 * DELETE /api/admin/wheel/participants — clear the wheel in one call. Prize
 * definitions and the winner history stay intact.
 */
export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const result = await removeAllParticipants();
  if (!result.ok) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }
  return Response.json({ success: true, data: { removed: result.removed } });
}
