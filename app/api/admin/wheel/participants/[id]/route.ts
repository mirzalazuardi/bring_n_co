import { removeParticipant } from '@/lib/admin/doorprize';
import { requireAdmin } from '@/lib/admin/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** DELETE /api/admin/wheel/participants/[id] — remove a not-yet-won participant. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  if (!id) {
    return Response.json({ success: false, error: 'Participant id is required' }, { status: 400 });
  }

  const result = await removeParticipant(id);
  if (!result.ok) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }
  return Response.json({ success: true });
}
