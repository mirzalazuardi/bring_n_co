import { readChoiceOptions, readScaleOptions } from '@/lib/validations/questionnaire';
import type { Questionnaire } from '@prisma/client';

/**
 * Pure access gate for questionnaire filling (REQ-QR-002): logged-in users,
 * plus an APPROVED registration when the questionnaire toggles
 * `requireVerified`. Used by the fill page and the public submit route.
 */

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface QuestionnaireGateInput {
  /** questionnaire.requireVerified */
  requireVerified: boolean;
  isOpen: boolean;
  hasSession: boolean;
  registrationStatus: RegistrationStatus | null;
}

export type GateDenialReason =
  | 'CLOSED' // questionnaire switched off — old answers may still be shown
  | 'UNAUTHENTICATED'
  | 'NOT_VERIFIED';

export interface GateResult {
  allowed: boolean;
  reason?: GateDenialReason;
}

export function checkQuestionnaireAccess(
  input: QuestionnaireGateInput,
): GateResult {
  if (!input.hasSession) {
    return { allowed: false, reason: 'UNAUTHENTICATED' };
  }
  if (!input.isOpen) {
    return { allowed: false, reason: 'CLOSED' };
  }
  if (input.requireVerified && input.registrationStatus !== 'APPROVED') {
    return { allowed: false, reason: 'NOT_VERIFIED' };
  }
  return { allowed: true };
}

/** Human-readable message for a denial reason (used on pages). */
export function gateDenialMessage(reason: GateDenialReason, questionnaire: Pick<Questionnaire, 'requireVerified'>): string {
  switch (reason) {
    case 'UNAUTHENTICATED':
      return 'Silakan masuk terlebih dahulu untuk mengisi kuesioner.';
    case 'NOT_VERIFIED':
      return questionnaire.requireVerified
        ? 'Kuesioner ini hanya untuk alumni yang pendaftarannya sudah terverifikasi. Silakan selesaikan verifikasi di halaman Pendaftaran.'
        : 'Silakan selesaikan verifikasi di halaman Pendaftaran.';
    case 'CLOSED':
      return 'Kuesioner ini sudah ditutup oleh panitia. Terima kasih atas kontribusinya.';
  }
}

/* ---------- Stats aggregation (REQ-QR-004) ---------- */

export interface AnswerRow {
  questionId: string;
  userId?: string;
  respondentName?: string | null;
  choiceValue: string | null;
  numberValue: number | null;
  textValue: string | null;
  createdAt?: string;
}

export interface ChoiceStat {
  value: string;
  count: number;
  percent: number;
}

export interface ScaleStat {
  min: number;
  max: number;
  average: number | null;
  distribution: { value: number; count: number }[];
}

export interface TextStat {
  total: number;
  answers: { value: string; respondentName?: string | null; createdAt?: string }[];
}

export interface QuestionStat {
  questionId: string;
  label: string;
  type: string;
  required: boolean;
  /** number of stored answers for this question */
  total: number;
  choice?: ChoiceStat[];
  scale?: ScaleStat;
  text?: TextStat;
}

/** Aggregate one question's stored answer rows (pure, testable). */
export function buildQuestionStats(
  question: {
    id: string;
    label: string;
    type: string;
    required: boolean;
    options?: unknown;
  },
  answers: AnswerRow[],
): QuestionStat {
  const total = answers.length;
  const base: QuestionStat = {
    questionId: question.id,
    label: question.label,
    type: question.type,
    required: question.required,
    total,
  };

  if (question.type === 'CHOICE') {
    const counts = new Map<string, number>();
    for (const a of answers) {
      if (a.choiceValue !== null) counts.set(a.choiceValue, (counts.get(a.choiceValue) ?? 0) + 1);
    }
    // The question's own option list defines the distribution keys (zero
    // counts for unpicked options); answer values not in the list (e.g. from
    // options edited after collection) are still reported, at the end.
    const options = readChoiceOptions(question.options);
    const ordered = [...options];
    for (const [value] of counts) {
      if (!options.includes(value)) ordered.push(value);
    }
    base.choice = ordered.map((value) => ({
      value,
      count: counts.get(value) ?? 0,
      percent: total > 0 ? Math.round(((counts.get(value) ?? 0) / total) * 100) : 0,
    }));
    return base;
  }

  if (question.type === 'SCALE') {
    const { min, max } = readScaleOptions(question.options);
    const counts = new Map<number, number>();
    let sum = 0;
    let sampled = 0;
    for (const a of answers) {
      if (a.numberValue !== null) {
        counts.set(a.numberValue, (counts.get(a.numberValue) ?? 0) + 1);
        sum += a.numberValue;
        sampled += 1;
      }
    }
    // Full distribution across the configured range (capped to keep the
    // report readable for adversarially large ranges), zero-filled.
    const distribution: { value: number; count: number }[] = [];
    for (let v = min; v <= max && distribution.length < 200; v += 1) {
      distribution.push({ value: v, count: counts.get(v) ?? 0 });
    }
    base.scale = {
      min,
      max,
      average: sampled > 0 ? Math.round((sum / sampled) * 100) / 100 : null,
      distribution: distribution.map(({ value, count }) => ({ value, count })),
    };
    return base;
  }

  // TEXT
  base.text = {
    total,
    answers: answers
      .filter((a) => a.textValue !== null)
      .map((a) => ({
        value: a.textValue ?? '',
        respondentName: a.respondentName ?? null,
        createdAt: a.createdAt,
      })),
  };
  return base;
}

/** Full questionnaire stats: per-question aggregates in question order. */
export function buildQuestionnaireStats(
  questions: {
    id: string;
    label: string;
    type: string;
    required: boolean;
    options?: unknown;
  }[],
  answers: AnswerRow[],
): QuestionStat[] {
  return questions.map((q) => buildQuestionStats(q, answers.filter((a) => a.questionId === q.id)));
}
