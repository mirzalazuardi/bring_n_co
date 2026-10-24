import { prisma } from '@/lib/prisma';
import { buildQuestionnaireStats } from '@/lib/questionnaire/access';
import Link from 'next/link';
import { BarChart2, ClipboardList, Users, Lock } from 'lucide-react';

export const metadata = {
  title: 'Hasil Kuesioner | SMA Negeri 14 Bandung',
};

export const dynamic = 'force-dynamic';

/**
 * Public results page (REQ-QR-004): shown only when the admin publishes the
 * questionnaire. Aggregates only — no respondent names, no answer identifiers.
 */
export default async function QuestionnaireResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!questionnaire) {
    return (
      <Notice
        title="Kuesioner tidak ditemukan"
        message="Tautan hasil kuesioner tidak valid."
      />
    );
  }

  if (!questionnaire.resultsPublished) {
    return (
      <Notice
        title="Hasil Belum Dipublikasikan"
        message="Rekap hasil kuesioner ini belum dipublikasikan oleh panitia. Terima kasih sudah mengisi!"
      />
    );
  }

  const answerRecords = await prisma.questionnaireAnswer.findMany({
    where: { questionnaireId: id },
    select: { questionId: true, choiceValue: true, numberValue: true, textValue: true, userId: true },
  });

  const answers = answerRecords.map((a) => ({
    questionId: a.questionId,
    choiceValue: a.choiceValue,
    numberValue: a.numberValue,
    textValue: a.textValue,
  }));

  const stats = buildQuestionnaireStats(questionnaire.questions, answers);
  const totalRespondents = new Set(answerRecords.map((a) => a.userId)).size;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 mb-4">
            <BarChart2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Hasil Kuesioner
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{questionnaire.title}</p>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-500 mt-3">
            <Users className="w-3.5 h-3.5" />
            {totalRespondents} alumni mengisi
          </p>
        </div>

        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div
              key={stat.questionId}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {index + 1}. {stat.label}
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-500">
                  ({stat.total} jawaban)
                </span>
              </h2>

              {stat.choice && (
                <div className="mt-4 space-y-2">
                  {stat.choice.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-3">
                      <span className="w-24 flex-shrink-0 text-xs truncate text-gray-600 dark:text-gray-400" title={opt.value}>
                        {opt.value}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500 dark:bg-teal-400 transition-all"
                          style={{ width: `${opt.percent}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {opt.count} · {opt.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {stat.scale && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Rata-rata:{' '}
                    <span className="font-bold text-teal-700 dark:text-teal-400">
                      {stat.scale.average ?? '—'}
                    </span>{' '}
                    (rentang {stat.scale.min}–{stat.scale.max})
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stat.scale.distribution.map((d) => (
                      <div
                        key={d.value}
                        className={`text-center rounded-lg border px-3 py-1.5 ${
                          d.count > 0
                            ? 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/30'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{d.value}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{d.count}×</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stat.text && (
                <div className="mt-4">
                  {stat.total > 0 && stat.text.total > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {stat.text.answers.map((t, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-2.5"
                        >
                          “{t.value}”
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Belum ada jawaban teks.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/kuesioner"
            className="btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2.5"
          >
            <ClipboardList className="w-4 h-4" />
            Menu Kuesioner
          </Link>
        </div>
      </div>
    </div>
  );
}

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 mb-4">
            <Lock className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{message}</p>
        </div>
      </div>
    </div>
  );
}
