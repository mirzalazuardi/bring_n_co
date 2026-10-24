import { describe, it, expect, vi } from 'vitest';

// Mock env before importing modules that read it (prisma pulls env).
vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock',
  },
}));

import {
  choiceOptionsSchema,
  scaleOptionsSchema,
  normalizeAdminQuestion,
  questionnaireSubmitSchema,
  validateAnswerValue,
  readChoiceOptions,
  readScaleOptions,
  DEFAULT_CHOICE_OPTIONS,
  DEFAULT_SCALE_OPTIONS,
} from '../lib/validations/questionnaire';
import {
  checkQuestionnaireAccess,
  buildQuestionnaireStats,
  type AnswerRow,
} from '../lib/questionnaire/access';
import { buildQuestionnaireFillUrl } from '../lib/questionnaire/url';

describe('choice options schema', () => {
  it('accepts 2..10 unique nonempty options', () => {
    expect(choiceOptionsSchema.safeParse(['Hadir', 'Tidak hadir']).success).toBe(true);
    expect(choiceOptionsSchema.safeParse(DEFAULT_CHOICE_OPTIONS).success).toBe(true);
  });

  it('rejects too few options, duplicates, and oversized values', () => {
    expect(choiceOptionsSchema.safeParse(['satu']).success).toBe(false);
    expect(choiceOptionsSchema.safeParse(['a', 'b', 'a']).success).toBe(false);
    expect(choiceOptionsSchema.safeParse(['', 'b']).success).toBe(false);
    expect(choiceOptionsSchema.safeParse(['a'.repeat(121), 'b']).success).toBe(false);
    expect(choiceOptionsSchema.safeParse(Array.from({ length: 11 }, (_, i) => String(i))).success).toBe(false);
  });
});

describe('scale options schema', () => {
  it('accepts default 1..5 and custom ranges', () => {
    expect(scaleOptionsSchema.safeParse(DEFAULT_SCALE_OPTIONS).success).toBe(true);
    expect(scaleOptionsSchema.safeParse({ min: 0, max: 10 }).success).toBe(true);
  });

  it('rejects inverted or oversized ranges', () => {
    expect(scaleOptionsSchema.safeParse({ min: 5, max: 1 }).success).toBe(false);
    expect(scaleOptionsSchema.safeParse({ min: 1, max: 2000 }).success).toBe(false);
    expect(scaleOptionsSchema.safeParse({ min: 1.5, max: 5 }).success).toBe(false);
  });
});

describe('normalizeAdminQuestion', () => {
  it('defaults CHOICE options to 1..5 and SCALE to 1..5', () => {
    const choice = normalizeAdminQuestion({ type: 'CHOICE', label: 'Nilai acara', required: true, options: null });
    expect(choice.ok && choice.question.options).toEqual(['1', '2', '3', '4', '5']);

    const scale = normalizeAdminQuestion({ type: 'SCALE', label: 'Skor', required: true, options: null });
    expect(scale.ok && scale.question.options).toEqual({ min: 1, max: 5 });
  });

  it('normalizes custom CHOICE values and custom SCALE range', () => {
    const choice = normalizeAdminQuestion({
      type: 'CHOICE',
      label: 'Hadir?',
      required: true,
      options: ['Hadir ', 'Tidak hadir'],
    });
    expect(choice.ok && choice.question.options).toEqual(['Hadir', 'Tidak hadir']);

    const scale = normalizeAdminQuestion({ type: 'SCALE', label: 'Skor', required: true, options: { min: 0, max: 10 } });
    expect(scale.ok && scale.question.options).toEqual({ min: 0, max: 10 });
  });

  it('rejects invalid per-type options', () => {
    expect(normalizeAdminQuestion({ type: 'CHOICE', label: 'x', required: true, options: ['satu'] }).ok).toBe(false);
    expect(normalizeAdminQuestion({ type: 'SCALE', label: 'x', required: true, options: { min: 9, max: 2 } }).ok).toBe(false);
  });

  it('clears options for TEXT questions', () => {
    const text = normalizeAdminQuestion({ type: 'TEXT', label: 'Kesan', required: false, options: ['ignored'] });
    expect(text.ok && text.question.options).toBeNull();
  });

  it('rejects empty labels and unknown types', () => {
    expect(normalizeAdminQuestion({ type: 'CHOICE', label: '   ', required: true }).ok).toBe(false);
    expect(normalizeAdminQuestion({ type: 'RADIO', label: 'x', required: true }).ok).toBe(false);
  });
});

describe('submit payload schema', () => {
  it('accepts typed answers', () => {
    expect(
      questionnaireSubmitSchema.safeParse({
        answers: [
          { questionId: 'q1', choiceValue: 'Hadir' },
          { questionId: 'q2', numberValue: 4 },
          { questionId: 'q3', textValue: 'Mantap' },
          { questionId: 'q4' },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects empty payloads, oversized text, and float numbers', () => {
    expect(questionnaireSubmitSchema.safeParse({ answers: [] }).success).toBe(false);
    expect(questionnaireSubmitSchema.safeParse({ answers: [{ questionId: 'q1', textValue: 'x'.repeat(2001) }] }).success).toBe(false);
    expect(questionnaireSubmitSchema.safeParse({ answers: [{ questionId: 'q1', numberValue: 2.5 }] }).success).toBe(false);
    expect(questionnaireSubmitSchema.safeParse({ }).success).toBe(false);
  });
});

describe('validateAnswerValue', () => {
  const choiceQ = { id: 'q1', type: 'CHOICE' as const, label: 'Hadir?', description: null, required: true, options: ['Hadir', 'Tidak'] };
  const scaleQ = { id: 'q2', type: 'SCALE' as const, label: 'Skor', description: null, required: true, options: { min: 1, max: 5 } };
  const textQ = { id: 'q3', type: 'TEXT' as const, label: 'Kesan', description: null, required: false, options: null };
  const optionalChoice = { ...choiceQ, required: false };

  it('validates choice values against the option list', () => {
    expect(validateAnswerValue(choiceQ, { questionId: 'q1', choiceValue: 'Hadir' })).toBeNull();
    expect(validateAnswerValue(choiceQ, { questionId: 'q1', choiceValue: 'Mungkin' })).toBe('Jawaban tidak sesuai dengan pilihan yang tersedia');
    expect(validateAnswerValue(choiceQ, { questionId: 'q1' })).toBe('Pertanyaan ini wajib diisi');
    expect(validateAnswerValue(optionalChoice, { questionId: 'q1' })).toBeNull();
  });

  it('validates scale values against the configured range', () => {
    expect(validateAnswerValue(scaleQ, { questionId: 'q2', numberValue: 5 })).toBeNull();
    expect(validateAnswerValue(scaleQ, { questionId: 'q2', numberValue: 0 })).toBe('Jawaban skala harus di antara 1 dan 5');
    expect(validateAnswerValue(scaleQ, { questionId: 'q2', numberValue: 6 })).toBe('Jawaban skala harus di antara 1 dan 5');
    expect(validateAnswerValue(scaleQ, { questionId: 'q2' })).toBe('Pertanyaan ini wajib diisi');
  });

  it('validates text answers', () => {
    expect(validateAnswerValue(textQ, { questionId: 'q3', textValue: 'Seru!' })).toBeNull();
    expect(validateAnswerValue(textQ, { questionId: 'q3' })).toBeNull(); // optional
    const requiredText = { ...textQ, required: true };
    expect(validateAnswerValue(requiredText, { questionId: 'q3' })).toBe('Pertanyaan ini wajib diisi');
    expect(validateAnswerValue(requiredText, { questionId: 'q3', textValue: 'x'.repeat(2001) })).toBe('Jawaban teks maksimal 2000 karakter');
  });
});

describe('questionnaire access gate', () => {
  it('requires a session first', () => {
    const gate = checkQuestionnaireAccess({
      requireVerified: false,
      isOpen: true,
      hasSession: false,
      registrationStatus: null,
    });
    expect(gate).toEqual({ allowed: false, reason: 'UNAUTHENTICATED' });
  });

  it('blocks requests when the questionnaire is closed', () => {
    const gate = checkQuestionnaireAccess({
      requireVerified: false,
      isOpen: false,
      hasSession: true,
      registrationStatus: 'APPROVED',
    });
    expect(gate).toEqual({ allowed: false, reason: 'CLOSED' });
  });

  it('requires an APPROVED registration when the verified toggle is on', () => {
    expect(
      checkQuestionnaireAccess({ requireVerified: true, isOpen: true, hasSession: true, registrationStatus: 'APPROVED' }).allowed,
    ).toBe(true);
    expect(
      checkQuestionnaireAccess({ requireVerified: true, isOpen: true, hasSession: true, registrationStatus: 'PENDING' }).reason,
    ).toBe('NOT_VERIFIED');
    expect(
      checkQuestionnaireAccess({ requireVerified: true, isOpen: true, hasSession: true, registrationStatus: null }).reason,
    ).toBe('NOT_VERIFIED');
  });

  it('allows any logged-in user when the verified toggle is off', () => {
    const gate = checkQuestionnaireAccess({
      requireVerified: false,
      isOpen: true,
      hasSession: true,
      registrationStatus: null,
    });
    expect(gate.allowed).toBe(true);
  });
});

describe('stats aggregation', () => {
  it('counts each choice option and fills zeros for unpicked options', () => {
    const stats = buildQuestionnaireStats(
      [{ id: 'q1', label: 'Menu?', type: 'CHOICE', required: true, options: ['Ayam', 'Ikan', 'Sapi'] }],
      [
        { questionId: 'q1', choiceValue: 'Ayam', numberValue: null, textValue: null },
        { questionId: 'q1', choiceValue: 'Ayam', numberValue: null, textValue: null },
        { questionId: 'q1', choiceValue: 'Ikan', numberValue: null, textValue: null },
      ],
    );
    expect(stats[0].total).toBe(3);
    expect(stats[0].choice).toEqual([
      { value: 'Ayam', count: 2, percent: 67 },
      { value: 'Ikan', count: 1, percent: 33 },
      { value: 'Sapi', count: 0, percent: 0 },
    ]);
  });

  it('computes scale average and full distribution', () => {
    const stats = buildQuestionnaireStats(
      [{ id: 'q2', label: 'Skor', type: 'SCALE', required: true, options: { min: 1, max: 5 } }],
      [
        { questionId: 'q2', choiceValue: null, numberValue: 1, textValue: null },
        { questionId: 'q2', choiceValue: null, numberValue: 5, textValue: null },
        { questionId: 'q2', choiceValue: null, numberValue: 5, textValue: null },
      ],
    );
    const scale = stats[0].scale!;
    expect(scale.average).toBe(3.67);
    expect(scale.distribution).toEqual([
      { value: 1, count: 1 },
      { value: 2, count: 0 },
      { value: 3, count: 0 },
      { value: 4, count: 0 },
      { value: 5, count: 2 },
    ]);
  });

  it('lists text answers without respondent names for public reports', () => {
    const stats = buildQuestionnaireStats(
      [{ id: 'q3', label: 'Kesan', type: 'TEXT', required: false }],
      [
        { questionId: 'q3', choiceValue: null, numberValue: null, textValue: 'Seru banget', respondentName: 'Andi' },
        { questionId: 'q3', choiceValue: null, numberValue: null, textValue: 'Mantap' },
      ],
    );
    expect(stats[0].text!.answers.map((a) => a.value)).toEqual(['Seru banget', 'Mantap']);
    // Names can be attached for the admin console view.
    const withNames = buildQuestionnaireStats(
      [{ id: 'q3', label: 'Kesan', type: 'TEXT', required: false }],
      [
        { questionId: 'q3', choiceValue: null, numberValue: null, textValue: 'Seru', respondentName: 'Andi' },
      ],
    );
    expect(withNames[0].text!.answers[0].respondentName).toBe('Andi');
  });

  it('groups answers per question across a multi-question questionnaire', () => {
    const questions = [
      { id: 'a', label: 'A', type: 'CHOICE', required: true, options: [] },
      { id: 'b', label: 'B', type: 'TEXT', required: true },
    ];
    const answers: AnswerRow[] = [
      { questionId: 'a', choiceValue: 'x', numberValue: null, textValue: null },
      { questionId: 'b', choiceValue: null, numberValue: null, textValue: 'halo' },
    ];
    const stats = buildQuestionnaireStats(questions, answers);
    expect(stats[0].type).toBe('CHOICE');
    expect(stats[1].total).toBe(1);
  });
});

describe('QR fill URL', () => {
  it('builds the /kuesioner link and strips trailing slashes', () => {
    expect(buildQuestionnaireFillUrl('https://reuni.example/', 'abc123')).toBe('https://reuni.example/kuesioner/abc123');
    expect(buildQuestionnaireFillUrl('http://localhost:3000', 'id-1')).toBe('http://localhost:3000/kuesioner/id-1');
  });
});

describe('stored options JSON readers', () => {
  it('falls back to defaults for malformed stored options', () => {
    expect(readChoiceOptions(null)).toEqual(DEFAULT_CHOICE_OPTIONS);
    expect(readChoiceOptions('bogus')).toEqual(DEFAULT_CHOICE_OPTIONS);
    expect(readChoiceOptions(['A', 'B'])).toEqual(['A', 'B']);
    expect(readScaleOptions(null)).toEqual({ min: 1, max: 5 });
    expect(readScaleOptions({ min: 9, max: 2 })).toEqual({ min: 1, max: 5 });
    expect(readScaleOptions({ min: 0, max: 10 })).toEqual({ min: 0, max: 10 });
  });
});
