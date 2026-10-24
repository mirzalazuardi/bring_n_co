'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Send, BarChart2 } from 'lucide-react';
import { readChoiceOptions, readScaleOptions } from '@/lib/validations/questionnaire';

export interface PublicQuestion {
  id: string;
  type: 'CHOICE' | 'SCALE' | 'TEXT';
  label: string;
  description: string | null;
  required: boolean;
  options: unknown;
}

interface QuestionnaireFormProps {
  questionnaireId: string;
  questions: PublicQuestion[];
  /** Stored answers from a previous submission (questionId → raw value). */
  initialAnswers?: Record<string, string | number>;
  /** Link shown after a successful submit (e.g. published results page). */
  resultsUrl?: string | null;
}

type AnswerValue = string | number | '';

export function QuestionnaireForm({
  questionnaireId,
  questions,
  initialAnswers = {},
  resultsUrl,
}: QuestionnaireFormProps) {
  const [values, setValues] = useState<Record<string, AnswerValue>>(() =>
    Object.fromEntries(questions.map((q) => {
      const existing = initialAnswers[q.id];
      if (q.type === 'SCALE') return [q.id, typeof existing === 'number' ? existing : ''];
      return [q.id, typeof existing === 'string' ? existing : ''];
    })),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const setValue = (questionId: string, value: AnswerValue) => {
    setValues((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const missing = questions.find(
      (q) =>
        q.required &&
        (values[q.id] === '' || values[q.id] === undefined ||
          (typeof values[q.id] === 'string' && (values[q.id] as string).trim() === '')),
    );
    if (missing) {
      setError(`Pertanyaan wajib belum dijawab: ${missing.label}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const answers = questions
        .map((q) => {
          const value = values[q.id];
          if (q.type === 'SCALE') {
            return value === '' || value === undefined
              ? { questionId: q.id }
              : { questionId: q.id, numberValue: Number(value) };
          }
          if (q.type === 'CHOICE') {
            return { questionId: q.id, choiceValue: value === '' ? undefined : String(value) };
          }
          return { questionId: q.id, textValue: String(value ?? '') };
        })
        .filter((a) => 'choiceValue' in a || 'numberValue' in a || 'textValue' in a);

      const res = await fetch(`/api/questionnaires/${questionnaireId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim jawaban kuesioner');
      }
      setSuccess(true);
      window.scrollTo({ top: 0 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak terduga.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 mb-4">
          <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Terima kasih!</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Jawaban kuesioner berhasil disimpan. Kamu bisa kembali dan memperbaiki selama kuesioner masih dibuka.
        </p>
        {resultsUrl && (
          <Link href={resultsUrl} className="btn-secondary inline-flex items-center gap-2 mt-6 text-sm px-4 py-2.5">
            <BarChart2 className="w-4 h-4" />
            Lihat Rekap Hasil
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {questions.map((q, index) => (
        <fieldset key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <legend className="sr-only">{q.label}</legend>
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {index + 1}. {q.label}
              {q.required && <span className="text-red-500 ml-0.5">*</span>}
            </p>
          </div>
          {q.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{q.description}</p>
          )}

          <div className="mt-4">
            {q.type === 'CHOICE' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {readChoiceOptions(q.options).map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center justify-center px-3 py-2.5 rounded-xl border cursor-pointer text-center transition-all ${
                      values[q.id] === opt
                        ? 'border-teal-300 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={values[q.id] === opt}
                      onChange={() => setValue(q.id, opt)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'SCALE' && (() => {
              const { min, max } = readScaleOptions(q.options);
              const current = values[q.id] === '' ? min : Number(values[q.id]);
              return (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-6 text-right">{min}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={current}
                    onChange={(e) => setValue(q.id, Number(e.target.value))}
                    className="flex-1 accent-teal-600 dark:accent-teal-400"
                    aria-label={q.label}
                  />
                  <span className="w-10 text-center text-sm font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg py-1">
                    {current}
                  </span>
                  <span className="w-6 text-xs font-semibold text-gray-500 dark:text-gray-400">{max}</span>
                </div>
              );
            })()}

            {q.type === 'TEXT' && (
              <textarea
                rows={3}
                maxLength={2000}
                value={String(values[q.id] ?? '')}
                onChange={(e) => setValue(q.id, e.target.value)}
                placeholder="Tulis jawabanmu di sini…"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            )}
          </div>
        </fieldset>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? 'Mengirim…' : 'Kirim Jawaban'}
      </button>
    </form>
  );
}
