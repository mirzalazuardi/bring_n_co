import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { BarChart2, ClipboardList, Lock } from 'lucide-react';

export const metadata = {
  title: 'Kuesioner | SMA Negeri 14 Bandung',
};

export const dynamic = 'force-dynamic';

export default async function QuestionnaireListPage() {
  const questionnaires = await prisma.questionnaire.findMany({
    where: { isOpen: true },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 mb-4">
            <ClipboardList className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Kuesioner
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Silakan isi kuesioner berikut. Kuesioner membutuhkan akun yang sudah masuk
            {questionnaires.some((q) => q.requireVerified) && ' (sebagian hanya untuk pendaftaran terverifikasi)'}.
          </p>
        </div>

        {questionnaires.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Belum ada kuesioner yang dibuka. Nantikan kabar dari panitia.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questionnaires.map((q) => (
              <div
                key={q.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{q.title}</h2>
                {q.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{q.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {q._count.questions} pertanyaan
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      q.requireVerified
                        ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                        : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {q.requireVerified ? (
                      <>
                        <Lock className="w-3 h-3" />
                        Khusus terverifikasi
                      </>
                    ) : (
                      'Semua alumni'
                    )}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/kuesioner/${q.id}`} className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5">
                    <ClipboardList className="w-4 h-4" />
                    Isi Kuesioner
                  </Link>
                  {q.resultsPublished && (
                    <Link
                      href={`/kuesioner/${q.id}/hasil`}
                      className="btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2.5"
                    >
                      <BarChart2 className="w-4 h-4" />
                      Lihat Hasil
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
