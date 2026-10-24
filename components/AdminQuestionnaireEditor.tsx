'use client';

import React, { useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  Save,
  RotateCcw,
  ListChecks,
  SlidersHorizontal,
  Type as TypeIcon,
} from 'lucide-react';
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  DEFAULT_CHOICE_OPTIONS,
  MAX_OPTIONS,
} from '@/lib/validations/questionnaire';
import type { QuestionType } from '@/lib/validations/questionnaire';

export interface AdminQuestion {
  id: string | null;
  type: QuestionType;
  label: string;
  description: string;
  required: boolean;
  choiceOptions: string[];
  scaleMin: number;
  scaleMax: number;
}

/** Stored question row as served by the detail API. */
export interface StoredQuestion {
  id: string;
  type: string;
  label: string;
  description: string | null;
  required: boolean;
  options: unknown;
}

/** Adapt a stored question row into the editor's draft shape. */
export function toAdminQuestion(q: StoredQuestion): AdminQuestion {
  const type = (QUESTION_TYPES.includes(q.type as QuestionType) ? q.type : 'CHOICE') as QuestionType;
  let choiceOptions = DEFAULT_CHOICE_OPTIONS.map(String);
  let scaleMin = 1;
  let scaleMax = 5;
  if (type === 'CHOICE' && Array.isArray(q.options) && q.options.length >= 2) {
    choiceOptions = q.options.map((o) => String(o));
  }
  if (type === 'SCALE' && q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
    const { min, max } = q.options as { min?: unknown; max?: unknown };
    if (typeof min === 'number' && typeof max === 'number') {
      scaleMin = min;
      scaleMax = max;
    }
  }
  return {
    id: q.id,
    type,
    label: q.label,
    description: q.description ?? '',
    required: q.required,
    choiceOptions,
    scaleMin,
    scaleMax,
  };
}

export function newAdminQuestion(type: QuestionType = 'CHOICE'): AdminQuestion {
  return {
    id: null,
    type,
    label: '',
    description: '',
    required: true,
    choiceOptions: [...DEFAULT_CHOICE_OPTIONS],
    scaleMin: 1,
    scaleMax: 5,
  };
}

const TYPE_ICONS: Record<QuestionType, React.ElementType> = {
  CHOICE: ListChecks,
  SCALE: SlidersHorizontal,
  TEXT: TypeIcon,
};

export function AdminQuestionnaireEditor({
  questionnaireId,
  initialQuestions,
}: {
  questionnaireId: string;
  initialQuestions: StoredQuestion[];
}) {
  const [questions, setQuestions] = useState<AdminQuestion[]>(initialQuestions.map(toAdminQuestion));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const update = (index: number, patch: Partial<AdminQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const move = (index: number, delta: -1 | 1) => {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateChoiceOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const choiceOptions = q.choiceOptions.map((o, oi) => (oi === optIndex ? value : o));
        return { ...q, choiceOptions };
      }),
    );
  };

  const addChoiceOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex && q.choiceOptions.length < MAX_OPTIONS
          ? { ...q, choiceOptions: [...q.choiceOptions, `Opsi ${q.choiceOptions.length + 1}`] }
          : q,
      ),
    );
  };

  const removeChoiceOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, choiceOptions: q.choiceOptions.filter((_, oi) => oi !== optIndex) } : q,
      ),
    );
  };

  const resetChoiceOptions = (qIndex: number) => {
    update(qIndex, { choiceOptions: [...DEFAULT_CHOICE_OPTIONS] });
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    setError(null);
    setSuccess(null);

    // Client-side sanity checks mirror the API before we hand off.
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.label.trim()) {
        setError(`Pertanyaan #${i + 1}? label wajib diisi.`);
        return;
      }
      if (q.type === 'CHOICE') {
        const opts = q.choiceOptions.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) {
          setError(`Pertanyaan #${i + 1} butuh minimal 2 opsi.`);
          return;
        }
        if (new Set(opts).size !== q.choiceOptions.length) {
          setError(`Pertanyaan #${i + 1} punya opsi kosong atau duplikat.`);
          return;
        }
      }
      if (q.type === 'SCALE' && q.scaleMin >= q.scaleMax) {
        setError(`Pertanyaan #${i + 1}: Nilai minimum harus lebih kecil dari maximum.`);
        return;
      }
    }
    if (questions.length === 0) {
      setError('Kuesioner butuh minimal 1 pertanyaan.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = questions.map((q) => ({
        ...(q.id ? { id: q.id } : {}),
        type: q.type,
        label: q.label,
        description: q.description.trim() || null,
        required: q.required,
        options:
          q.type === 'CHOICE'
            ? q.choiceOptions
            : q.type === 'SCALE'
              ? { min: q.scaleMin, max: q.scaleMax }
              : null,
      }));

      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan pertanyaan');
      }
      setQuestions((data.data.questions as StoredQuestion[]).map(toAdminQuestion));
      setSuccess('Pertanyaan tersimpan.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
          {success}
        </p>
      )}

      {questions.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-6 text-center">
          Belum ada pertanyaan. Tambahkan pertanyaan pertama di bawah.
        </p>
      )}

      {questions.map((q, index) => {
        const TypeIcon = TYPE_ICONS[q.type];
        return (
          <div
            key={q.id ?? `draft-${index}`}
            className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-700/30"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                <TypeIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {QUESTION_TYPE_LABELS[q.type]}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(index, -1)} disabled={index === 0} title="Naik"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(index, 1)} disabled={index === questions.length - 1} title="Turun"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30">
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button onClick={() => removeQuestion(index)} title="Hapus pertanyaan"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <input
              type="text"
              value={q.label}
              onChange={(e) => update(index, { label: e.target.value })}
              placeholder="Tulis pertanyaannya…"
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="text"
              value={q.description}
              onChange={(e) => update(index, { description: e.target.value })}
              placeholder="Deskripsi tambahan (opsional)"
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 mt-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            <div className="flex items-center gap-3 mt-3">
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => update(index, { required: e.target.checked })}
                  className="accent-teal-600"
                />
                Wajib diisi
              </label>

              <select
                value={q.type}
                onChange={(e) => {
                  const type = e.target.value as QuestionType;
                  const fresh = newAdminQuestion(type);
                  update(index, { ...fresh, id: q.id, label: q.label, description: q.description, required: q.required });
                }}
                className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-200 ml-auto"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {q.type === 'CHOICE' && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Opsi ({q.choiceOptions.length}/{MAX_OPTIONS})
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => resetChoiceOptions(index)}
                      title="Kembalikan ke default 1–5"
                      className="inline-flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Default 1–5
                    </button>
                    <button
                      onClick={() => addChoiceOption(index)}
                      disabled={q.choiceOptions.length >= MAX_OPTIONS}
                      className="inline-flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                      Tambah Opsi
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.choiceOptions.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={opt}
                        maxLength={120}
                        onChange={(e) => updateChoiceOption(index, oi, e.target.value)}
                        placeholder={`Opsi ${oi + 1}`}
                        className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        onClick={() => removeChoiceOption(index, oi)}
                        disabled={q.choiceOptions.length <= 2}
                        title="Hapus opsi"
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {q.type === 'SCALE' && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Rentang skala</span>
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  Min
                  <input
                    type="number"
                    value={q.scaleMin}
                    onChange={(e) => update(index, { scaleMin: Number(e.target.value) })}
                    className="w-16 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>
                <span className="text-gray-400">–</span>
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  Max
                  <input
                    type="number"
                    value={q.scaleMax}
                    onChange={(e) => update(index, { scaleMax: Number(e.target.value) })}
                    className="w-16 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
          <button
            key={t}
            onClick={() => setQuestions((prev) => [...prev, newAdminQuestion(t)])}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs px-3 py-2"
          >
            <Plus className="w-3.5 h-3.5" />
            {QUESTION_TYPE_LABELS[t]}
          </button>
        ))}
        <button
          onClick={save}
          disabled={isSaving}
          className="btn-primary inline-flex items-center gap-2 text-sm px-5 py-2.5 disabled:opacity-50 ml-auto"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Pertanyaan
        </button>
      </div>
    </div>
  );
}
