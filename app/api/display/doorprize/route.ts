import { getWheelSnapshot } from '@/lib/admin/doorprize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/display/doorprize — public, read-only wheel state for the
 * projector page (REQ-DW-005). Names are the event's on-stage content by
 * design (alumni see the draw live); no sensitive fields are returned and
 * no mutation endpoint exists at this path.
 */
export async function GET() {
  const snapshot = await getWheelSnapshot();
  if (!snapshot.ok) {
    return Response.json({ success: false, error: snapshot.error }, { status: 500 });
  }

  return Response.json({
    success: true,
    data: {
      participants: snapshot.participants.map((p) => p.name ?? p.userId),
      latest: snapshot.draws[0]
        ? {
            userName: snapshot.draws[0].userName,
            prizeName: snapshot.draws[0].prizeName,
            drawnAt: snapshot.draws[0].drawnAt.toISOString(),
          }
        : null,
      history: snapshot.draws.slice(0, 10).map((d) => ({
        userName: d.userName,
        prizeName: d.prizeName,
        drawnAt: d.drawnAt.toISOString(),
      })),
    },
  });
}
