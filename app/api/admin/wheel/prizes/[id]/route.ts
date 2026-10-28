import { deletePrize } from '@/lib/admin/doorprize';
import { requireAdmin } from '@/lib/admin/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** DELETE /api/admin/wheel/prizes/[id] — 409 when the prize has draws (REQ-DW-002). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  if (!id) {
    return Response.json({ success: false, error: 'Prize id is required' }, { status: 400 });
  }

  const result = await deletePrize(id);
  if (!result.ok) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }
  return Response.json({ success: true });
}
