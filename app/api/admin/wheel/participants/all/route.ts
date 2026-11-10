import { addAllParticipants } from '@/lib/admin/doorprize';
import { requireAdmin } from '@/lib/admin/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/wheel/participants/all — add every verified registrant who
 * is not yet on the wheel in one call (REQ-DW-001 bulk add). Already-present
 * participants are skipped, so the action is safe to repeat.
 */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const result = await addAllParticipants();
  if (!result.ok) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }
  return Response.json({ success: true, data: { added: result.added, total: result.total } });
}
