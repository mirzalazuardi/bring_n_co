import { prisma } from '@/lib/prisma';
import { AdminQuestionnaireList } from '@/components/AdminQuestionnaireList';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';

export const metadata = {
  title: 'Kelola Kuesioner | Admin Panitia',
};

export const dynamic = 'force-dynamic';

export default async function AdminQuestionnairesPage() {
  const [questionnaires, respondentRows] = await Promise.all([
    prisma.questionnaire.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.$queryRaw<{ questionnaireId: string; respondents: number }[]>`
      SELECT "questionnaireId", COUNT(DISTINCT "userId")::int AS respondents
      FROM "questionnaire_answers"
      GROUP BY "questionnaireId"
    `,
  ]);

  const respondentsByQuestionnaire = new Map(
    respondentRows.map((r) => [r.questionnaireId, r.respondents]),
  );

  const rows = questionnaires.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    isOpen: q.isOpen,
    requireVerified: q.requireVerified,
    resultsPublished: q.resultsPublished,
    questionCount: q._count.questions,
    respondents: respondentsByQuestionnaire.get(q.id) ?? 0,
    createdAt: q.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800">
              <ClipboardList className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                Kuesioner
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kelola pertanyaan, QR pengisian, dan rekap statistik jawaban
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Konsol Admin
          </Link>
        </div>

        <AdminQuestionnaireList initialRows={rows} />
      </div>
    </div>
  );
}
