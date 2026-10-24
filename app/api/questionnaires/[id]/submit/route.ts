import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkQuestionnaireAccess } from '@/lib/questionnaire/access';
import {
  questionnaireSubmitSchema,
  validateAnswerValue,
  type NormalizedQuestion,
} from '@/lib/validations/questionnaire';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/questionnaires/:id/submit — store or correct the current user's
 * answers (REQ-QR-002/003). Gated: must be logged in; `requireVerified`
 * additionally demands an APPROVED registration. Answers are upserted per
 * question (one row per user per question); optional questions left empty
 * delete any stored answer so a resubmission fully replaces the old set.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !session.user || !userId) {
    return NextResponse.json(
      { success: false, error: 'Silakan masuk terlebih dahulu untuk mengisi kuesioner' },
      { status: 401 },
    );
  }

  const { id } = await params;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  if (!questionnaire) {
    return NextResponse.json({ success: false, error: 'Kuesioner tidak ditemukan' }, { status: 404 });
  }

  let registrationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null = null;
  if (questionnaire.requireVerified) {
    const registration = await prisma.registration.findUnique({
      where: { userId },
      select: { status: true },
    });
    registrationStatus = registration?.status ?? null;
  }

  const gate = checkQuestionnaireAccess({
    requireVerified: questionnaire.requireVerified,
    isOpen: questionnaire.isOpen,
    hasSession: Boolean(userId),
    registrationStatus,
  });
  if (!gate.allowed) {
    const status = gate.reason === 'UNAUTHENTICATED' ? 401 : 403;
    return NextResponse.json({ success: false, error: 'Akses ditolak', reason: gate.reason }, { status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = questionnaireSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const questionsById = new Map<string, NormalizedQuestion>(
    questionnaire.questions.map((q) => [
      q.id,
      {
        id: q.id,
        type: q.type,
        label: q.label,
        description: q.description,
        required: q.required,
        options: (q.options ?? null) as NormalizedQuestion['options'],
      },
    ]),
  );

  const seen = new Set<string>();
  const validAnswerValues: {
    questionId: string;
    choiceValue: string | null;
    numberValue: number | null;
    textValue: string | null;
  }[] = [];

  for (const answer of parsed.data.answers) {
    const question = questionsById.get(answer.questionId);
    if (!question) {
      return NextResponse.json(
        { success: false, error: `Pertanyaan tidak dikenal (id ${answer.questionId})` },
        { status: 400 },
      );
    }
    if (seen.has(answer.questionId)) {
      return NextResponse.json(
        { success: false, error: 'Jawaban duplikat untuk satu pertanyaan' },
        { status: 400 },
      );
    }
    seen.add(answer.questionId);

    const error = validateAnswerValue(question, answer);
    if (error) {
      return NextResponse.json(
        { success: false, error: `${question.label}: ${error}` },
        { status: 400 },
      );
    }

    validAnswerValues.push({
      questionId: answer.questionId,
      choiceValue: answer.choiceValue?.trim() || null,
      numberValue: answer.numberValue ?? null,
      textValue: answer.textValue?.trim() || null,
    });
  }

  const missingRequired = questionnaire.questions
    .filter((q) => q.required && !seen.has(q.id))
    .map((q) => q.label);
  if (missingRequired.length > 0) {
    return NextResponse.json(
      { success: false, error: `Pertanyaan wajib belum dijawab: ${missingRequired.join(', ')}` },
      { status: 400 },
    );
  }

  // Optional questions not present in this submission must not keep stale
  // values from a previous submit — the latest submission is authoritative.
  const answeredIds = [...seen];
  const staleWhere: Prisma.QuestionnaireAnswerWhereInput = {
    questionnaireId: id,
    userId,
    questionId: { notIn: answeredIds },
  };

  await prisma.$transaction(async (tx) => {
    await tx.questionnaireAnswer.deleteMany({ where: staleWhere });

    for (const a of validAnswerValues) {
      if (a.choiceValue === null && a.numberValue === null && a.textValue === null) continue;
      await tx.questionnaireAnswer.upsert({
        where: { questionId_userId: { questionId: a.questionId, userId } },
        create: { questionnaireId: id, ...a, userId },
        update: {
          choiceValue: a.choiceValue,
          numberValue: a.numberValue,
          textValue: a.textValue,
        },
      });
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Jawaban kuesioner berhasil dikirim. Terima kasih!',
  });
}
