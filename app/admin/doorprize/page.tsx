import { getWheelSnapshot, listEligibleCandidates, type DrawView } from '@/lib/admin/doorprize';
import { AdminDoorprizeConsole } from '@/components/AdminDoorprizeConsole';
import { Gift } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Doorprize | Admin Panitia',
};

export const dynamic = 'force-dynamic';

/** Admin doorprize console — wheel whose segments are participants. */
export default async function AdminDoorprizePage() {
  const [snapshot, candidates] = await Promise.all([getWheelSnapshot(), listEligibleCandidates()]);

  const draws: DrawView[] = snapshot.ok
    ? snapshot.draws.map((d) => ({ ...d, drawnAt: d.drawnAt.toISOString() }))
    : [];
  const display = candidates.ok
    ? candidates.candidates.map((c) => ({ id: c.id, name: c.name ?? c.id }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
              <Gift className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                Doorprize — Undian Hadiah
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pilih hadiah &rarr; undi peserta. Pemenang otomatis keluar dari wheel; tayang publik di{' '}
                <Link href="/display/doorprize" className="underline font-medium" target="_blank">
                  /display/doorprize
                </Link>
              </p>
            </div>
          </div>
          <Link href="/admin" className="btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2.5">
            <ArrowLeft className="w-4 h-4" />
            Konsol Admin
          </Link>
        </div>

        {snapshot.ok ? (
          <AdminDoorprizeConsole
            initialParticipants={snapshot.participants}
            initialPrizes={snapshot.prizes}
            initialDraws={draws}
            initialCandidates={display}
          />
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">{snapshot.error}</p>
        )}
      </div>
    </div>
  );
}
