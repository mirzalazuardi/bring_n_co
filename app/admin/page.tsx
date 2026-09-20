import { prisma } from '@/lib/prisma';
import { toAdminRows } from '@/lib/admin/rows';
import { AdminRegistrationsTable } from '@/components/AdminRegistrationsTable';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Admin Console | SMA Negeri 14 Bandung',
};

export const dynamic = 'force-dynamic';

/**
 * Admin console shell. Access control happens in middleware (Basic Auth);
 * this page only renders data. The client table talks to /api/admin/*,
 * which re-verifies the same credentials server-side.
 */
export default async function AdminPage() {
  const registrations = await prisma.registration.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });

  const rows = toAdminRows(registrations);
  const pending = rows.filter((r) => r.status === 'PENDING').length;
  const approved = rows.filter((r) => r.status === 'APPROVED').length;
  const rejected = rows.filter((r) => r.status === 'REJECTED').length;

  const stats = [
    { label: 'Total', value: rows.length },
    { label: 'Menunggu', value: pending },
    { label: 'Terverifikasi', value: approved },
    { label: 'Ditolak', value: rejected },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800">
              <ShieldCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                Admin Panitia
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verifikasi pendaftaran dan unduh rekap pendaftar
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin/gallery"
              className="btn-secondary inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5"
            >
              Kelola Galeri
            </a>
            <a
              href="/admin/upload"
              className="btn-secondary inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5"
            >
              Upload Galeri
            </a>
            <a
              href="/api/admin/registrations/export"
              className="btn-primary inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
              </svg>
              Export Excel (.xlsx)
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-center shadow-sm"
            >
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <AdminRegistrationsTable initialRows={rows} />
      </div>
    </div>
  );
}
