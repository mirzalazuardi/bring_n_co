import { prisma } from '@/lib/prisma';
import { AdminQuestionnaireEditor } from '@/components/AdminQuestionnaireEditor';
import { AdminQuestionnaireStats } from '@/components/AdminQuestionnaireStats';
import { buildAdminReport } from '@/lib/questionnaire/report';
import { buildQuestionnaireFillUrl } from '@/lib/questionnaire/url';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ClipboardList, QrCode } from 'lucide-react';

export const metadata = {
  title: 'Kelola Kuesioner | Admin Panitia',
};

export const dynamic = 'force-dynamic';

export default async function AdminQuestionnaireManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Build the admin report once — it also proves the questionnaire exists.
  const report = await buildAdminReport(id);
  if (!report) notFound();

  const questions = await prisma.questionnaireQuestion.findMany({
    where: { questionnaireId: id },
    orderBy: { order: 'asc' },
  });

  // Server components have no request object; NEXTAUTH_URL is the reliable
  // base in production. The QR SVG itself is served by the admin API route.
  const fillUrl = buildQuestionnaireFillUrl(
    (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, ''),
    id,
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800">
              <ClipboardList className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                {report.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Status: {report.isOpen ? 'Dibuka' : 'Ditutup'} ·{' '}
                {report.requireVerified ? 'Wajib verified' : 'Semua alumni'} ·{' '}
                {report.resultsPublished ? 'Hasil publik' : 'Hasil privat'}
              </p>
            </div>
          </div>
          <Link
            href="/admin/kuesioner"
            className="btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Daftar Kuesioner
          </Link>
        </div>

        {/* QR + fill URL */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
            <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            QR Pengisian
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/admin/questionnaires/${id}/qr`}
              alt="QR kuesioner"
              className="w-44 h-44 border border-gray-200 dark:border-gray-700 rounded-xl bg-white p-2"
            />
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                Tautan halaman pengisian:{' '}
                <span className="font-mono text-xs break-all text-gray-800 dark:text-gray-200">{fillUrl}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Cetak atau bagikan QR ini ke grup alumni. Pengisian memakai akun alumni
                {report.requireVerified ? ' dan pendaftaran yang sudah terverifikasi.' : ' (semua pengguna yang masuk).'}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={`/kuesioner/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs px-3 py-2"
                >
                  Pratinjau Halaman
                </a>
                <a
                  href={`/api/admin/questionnaires/${id}/qr`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`qr-kuesioner-${id}.svg`}
                  className="btn-secondary text-xs px-3 py-2"
                >
                  Unduh QR (SVG)
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Question builder */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">
            Pertanyaan Kuesioner
          </h2>
          <AdminQuestionnaireEditor
            questionnaireId={id}
            initialQuestions={questions.map((q) => ({
              id: q.id,
              type: q.type,
              label: q.label,
              description: q.description,
              required: q.required,
              options: q.options,
            }))}
          />
        </div>

        {/* Stats report */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">
            Rekap Statistik
          </h2>
          <AdminQuestionnaireStats
            questionnaireId={id}
            initialStats={{
              totalRespondents: report.totalRespondents,
              resultsPublished: report.resultsPublished,
              stats: report.stats,
            }}
          />
        </div>
      </div>
    </div>
  );
}
