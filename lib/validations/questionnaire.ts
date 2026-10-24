import { z } from 'zod';

/**
 * Shared contract for the questionnaire feature: question definitions,
 * answer payloads, and per-type normalization. See
 * openspec/changes/feat-questionnaire/specs/questionnaire.md.
 */

export const QUESTION_TYPES = ['CHOICE', 'SCALE', 'TEXT'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Indonesian labels for the admin builder UI. */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  CHOICE: 'Pilihan Ganda',
  SCALE: 'Skala (Range 1–5)',
  TEXT: 'Teks Bebas',
};

/** Multiple choice defaults — 1..5, count & values customizable by admin. */
export const DEFAULT_CHOICE_OPTIONS = ['1', '2', '3', '4', '5'];

/** Range/scale UI defaults — slider 1..5 (min/max customizable). */
export const DEFAULT_SCALE_OPTIONS = { min: 1, max: 5 };

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;
export const OPTION_MAX_LENGTH = 120;
export const LABEL_MAX_LENGTH = 500;
export const DESCRIPTION_MAX_LENGTH = 500;
export const TEXT_MAX_LENGTH = 2000;
export const SCALE_MAX_RANGE = 1000;
export const TITLE_MAX_LENGTH = 200;

export const choiceOptionsSchema = z
  .array(z.string().trim().min(1, 'Opsi tidak boleh kosong').max(OPTION_MAX_LENGTH, `Opsi maksimal ${OPTION_MAX_LENGTH} karakter`))
  .min(MIN_OPTIONS, `Minimal ${MIN_OPTIONS} opsi`)
  .max(MAX_OPTIONS, `Maksimal ${MAX_OPTIONS} opsi`)
  .refine((opts) => new Set(opts).size === opts.length, 'Opsi tidak boleh duplikat');

export const scaleOptionsSchema = z
  .object({ min: z.number().int(), max: z.number().int() })
  .refine((o) => o.min < o.max, 'Min harus lebih kecil dari max')
  .refine((o) => o.max - o.min <= SCALE_MAX_RANGE, `Rentang skala maksimal ${SCALE_MAX_RANGE}`);

/** Raw question as sent from the admin builder before normalization. */
export const adminQuestionSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(QUESTION_TYPES, { errorMap: () => ({ message: 'Tipe pertanyaan tidak valid' }) }),
  label: z.string().trim().min(1, 'Pertanyaan wajib diisi').max(LABEL_MAX_LENGTH),
  description: z.string().trim().max(DESCRIPTION_MAX_LENGTH).nullish(),
  required: z.boolean(),
  options: z.unknown().nullish(),
});

/** Normalized question ready for storage/rendering. */
export interface NormalizedQuestion {
  id?: string;
  type: QuestionType;
  label: string;
  description: string | null;
  required: boolean;
  /** CHOICE: string[]; SCALE: { min, max }; TEXT: null */
  options: string[] | { min: number; max: number } | null;
}

export type NormalizeResult =
  | { ok: true; options: string[] | { min: number; max: number } | null }
  | { ok: false; error: string };

/**
 * Validate + normalize the `options` JSON per question type. CHOICE falls
 * back to the 1..5 defaults and SCALE to the 1..5 range when unset.
 */
export function normalizeQuestionOptions(
  type: QuestionType,
  raw: unknown,
): NormalizeResult {
  if (type === 'TEXT') {
    return { ok: true, options: null };
  }
  if (type === 'CHOICE') {
    const options = raw === undefined || raw === null ? DEFAULT_CHOICE_OPTIONS : raw;
    const parsed = choiceOptionsSchema.safeParse(options);
    return parsed.success
      ? { ok: true, options: parsed.data }
      : { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }
  // SCALE
  const options = raw === undefined || raw === null ? DEFAULT_SCALE_OPTIONS : raw;
  const parsed = scaleOptionsSchema.safeParse(options);
  return parsed.success
    ? { ok: true, options: parsed.data }
    : { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
}

/** Parse one admin-builder question into its normalized shape (or error). */
export function normalizeAdminQuestion(raw: unknown):
  | { ok: true; question: NormalizedQuestion }
  | { ok: false; error: string } {
  const parsed = adminQuestionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }
  const options = normalizeQuestionOptions(parsed.data.type, parsed.data.options);
  if (!options.ok) {
    return { ok: false, error: `Opsi tidak valid: ${options.error}` };
  }
  return {
    ok: true,
    question: {
      id: parsed.data.id,
      type: parsed.data.type,
      label: parsed.data.label,
      description: parsed.data.description ?? null,
      required: parsed.data.required,
      options: options.options,
    },
  };
}

/* ---------- Submit payload ---------- */

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1, 'questionId wajib diisi'),
  choiceValue: z.string().max(OPTION_MAX_LENGTH).optional(),
  numberValue: z.number().int().optional(),
  textValue: z.string().max(TEXT_MAX_LENGTH, `Jawaban teks maksimal ${TEXT_MAX_LENGTH} karakter`).optional(),
});

export const questionnaireSubmitSchema = z.object({
  answers: z
    .array(submitAnswerSchema)
    .min(1, 'Tidak ada jawaban yang dikirim')
    .max(200, 'Terlalu banyak jawaban'),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

/**
 * Validate a single answer against its question definition. Returns an error
 * message (Indonesian) or null when valid. Pure — used by the submit route
 * and covered by unit tests.
 */
export function validateAnswerValue(question: NormalizedQuestion, answer: SubmitAnswerInput): string | null {
  const { choiceValue, numberValue, textValue } = answer;

  if (question.type === 'CHOICE') {
    const options = (question.options as string[] | null) ?? [];
    if (!choiceValue || !choiceValue.trim()) {
      return question.required ? 'Pertanyaan ini wajib diisi' : null;
    }
    if (!options.includes(choiceValue)) {
      return 'Jawaban tidak sesuai dengan pilihan yang tersedia';
    }
    return null;
  }

  if (question.type === 'SCALE') {
    const scale = (question.options as { min: number; max: number } | null) ?? DEFAULT_SCALE_OPTIONS;
    if (numberValue === undefined || numberValue === null) {
      return question.required ? 'Pertanyaan ini wajib diisi' : null;
    }
    if (numberValue < scale.min || numberValue > scale.max) {
      return `Jawaban skala harus di antara ${scale.min} dan ${scale.max}`;
    }
    return null;
  }

  // TEXT
  if (!textValue || !textValue.trim()) {
    return question.required ? 'Pertanyaan ini wajib diisi' : null;
  }
  if (textValue.trim().length > TEXT_MAX_LENGTH) {
    return `Jawaban teks maksimal ${TEXT_MAX_LENGTH} karakter`;
  }
  return null;
}

/** Helpers for reading the stored options JSON defensively. */
export function readChoiceOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [...DEFAULT_CHOICE_OPTIONS];
}

export function readScaleOptions(raw: unknown): { min: number; max: number } {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const { min, max } = raw as { min?: unknown; max?: unknown };
    if (typeof min === 'number' && typeof max === 'number' && min < max) {
      return { min, max };
    }
  }
  return { ...DEFAULT_SCALE_OPTIONS };
}
