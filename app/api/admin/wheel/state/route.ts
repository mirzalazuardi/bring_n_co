import { getWheelSnapshot } from '@/lib/admin/doorprize';
import { requireAdmin } from '@/lib/admin/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/wheel/state — full doorprize snapshot for the console:
 * remaining wheel participants, prize list (with a drawn flag for
 * delete-protection), and draw history (newest first).
 */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const snapshot = await getWheelSnapshot();
  if (!snapshot.ok) {
    return Response.json({ success: false, error: snapshot.error }, { status: 500 });
  }
  return Response.json({
    success: true,
    data: {
      participants: snapshot.participants,
      prizes: snapshot.prizes,
      draws: snapshot.draws,
    },
  });
}
