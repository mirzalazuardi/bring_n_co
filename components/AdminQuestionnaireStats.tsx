'use client';

import React, { useState } from 'react';
import { RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react';
import type { QuestionStat } from '@/lib/questionnaire/access';

interface StatsPayload {
  totalRespondents: number;
  resultsPublished: boolean;
  stats: QuestionStat[];
}

export function AdminQuestionnaireStats({
  questionnaireId,
  initialStats,
}: {
  questionnaireId: string;
  initialStats: StatsPayload;
}) {
  const [data, setData] = useState<StatsPayload>(initialStats);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}/stats`);
      if (!res.ok) throw new Error('Gagal memuat statistik');
      const payload = await res.json();
      setData({
        totalRespondents: payload.data.totalRespondents,
        resultsPublished: payload.data.resultsPublished,
        stats: payload.data.stats,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async () => {
    setToggling(true);
    const next = !data.resultsPublished;
    // Optimistic; rollback on failure.
    setData((prev) => ({ ...prev, resultsPublished: next }));
    try {
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultsPublished: next }),
      });
      if (!res.ok) throw new Error('Gagal mengubah status publikasi');
    } catch (err: unknown) {
      setData((prev) => ({ ...prev, resultsPublished: !next }));
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setToggling(false);
    }
  };

  const anyAnswer = data.stats.some((s) => s.total > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-secondary inline-flex items-center gap-2 text-xs px-3 py-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Muat Ulang
        </button>
        <button
          onClick={togglePublish}
          disabled={toggling}
          className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-xl font-semibold border transition-colors disabled:opacity-50 ${
            data.resultsPublished
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
          }`}
        >
          {data.resultsPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {data.resultsPublished ? 'Hasil Publik' : 'Hasil Privat'}
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {data.totalRespondents} respondent mengisi
        </span>
        {!anyAnswer && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Belum ada jawaban masuk.</span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {data.stats.map((stat, index) => (
        <div key={stat.questionId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {index + 1}. {stat.label}
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              ({stat.total} jawaban)
            </span>
          </h3>

          {stat.type === 'CHOICE' && stat.choice && (
            <div className="mt-3 space-y-2">
              {stat.choice.map((opt) => (
                <div key={opt.value} className="flex items-center gap-3">
                  <span className="w-24 flex-shrink-0 text-xs truncate text-gray-600 dark:text-gray-400" title={opt.value}>
                    {opt.value}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-500 dark:bg-teal-400"
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

          {stat.type === 'SCALE' && stat.scale && (
            <div className="mt-3">
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

          {stat.type === 'TEXT' && stat.text && (
            <div className="mt-3">
              {stat.text.total > 0 ? (
                <ul className="space-y-2">
                  {stat.text.answers.map((t, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-2.5"
                    >
                      <React.Fragment>
                        <span className="block">“{t.value}”</span>
                        {t.respondentName && (
                          <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            — {t.respondentName}
                          </span>
                        )}
                      </React.Fragment>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Belum ada jawaban teks.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
