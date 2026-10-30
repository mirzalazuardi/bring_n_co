import { getWheelSnapshot } from '@/lib/admin/doorprize';
import { DoorprizeDisplay } from '@/components/DoorprizeDisplay';

export const metadata = {
  title: 'Doorprize Display | SMA Negeri 14 Bandung',
};

export const dynamic = 'force-dynamic';

/**
 * Public projector display (no auth, no controls) — see
 * openspec/changes/feat-doorprize-wheel/specs/doorprize.md REQ-DW-005.
 */
export default async function DoorprizeDisplayPage() {
  const snapshot = await getWheelSnapshot();

  const initialState = {
    participants: snapshot.ok ? snapshot.participants.map((p) => p.name ?? p.userId) : [],
    latest: snapshot.ok && snapshot.draws[0]
      ? {
          userName: snapshot.draws[0].userName,
          prizeName: snapshot.draws[0].prizeName,
          drawnAt: snapshot.draws[0].drawnAt.toISOString(),
        }
      : null,
    history: (snapshot.ok ? snapshot.draws : [])
      .slice(0, 10)
      .map((d) => ({
        userName: d.userName,
        prizeName: d.prizeName,
        drawnAt: d.drawnAt.toISOString(),
      })),
  };

  return <DoorprizeDisplay initialState={initialState} />;
}
