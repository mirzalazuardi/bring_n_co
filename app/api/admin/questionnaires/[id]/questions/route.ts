import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/api-guard';
import { normalizeAdminQuestion } from '@/lib/validations/questionnaire';
import type { NormalizedQuestion } from '@/lib/validations/questionnaire';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/questionnaires/:id/questions — replace the question set.
 * Existing questions (matched by id) are updated in place so stored answers
 * survive edits/reordering; questions missing from the payload are deleted
 * (their answers cascade). Removing all existing ids requires sending at
 * least one question — an empty question set is rejected.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const rawQuestions = (body as { questions?: unknown })?.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0 || rawQuestions.length > 100) {
    return Response.json(
      { success: false, error: 'Kuesioner harus memiliki 1–100 pertanyaan' },
      { status: 400 },
    );
  }

  const normalized: NormalizedQuestion[] = [];
  for (let i = 0; i < rawQuestions.length; i += 1) {
    const result = normalizeAdminQuestion(rawQuestions[i]);
    if (!result.ok) {
      return Response.json(
        { success: false, error: `Pertanyaan #${i + 1}: ${result.error}` },
        { status: 400 },
      );
    }
    normalized.push(result.question);
  }

  const questionnaire = await prisma.questionnaire.findUnique({ where: { id }, select: { id: true } });
  if (!questionnaire) {
    return Response.json({ success: false, error: 'Kuesioner tidak ditemukan' }, { status: 404 });
  }

  const existingIds = new Set(
    (
      await prisma.questionnaireQuestion.findMany({
        where: { questionnaireId: id },
        select: { id: true },
      })
    ).map((q) => q.id),
  );

  const keepIds = new Set(normalized.map((q) => q.id).filter((qid): qid is string => Boolean(qid)));

  // An id that doesn't belong to this questionnaire would silently orphan a
  // question — reject rather than shimmer it into a new record.
  for (const qid of keepIds) {
    if (!existingIds.has(qid)) {
      return Response.json(
        { success: false, error: `Pertanyaan dengan id ${qid} tidak ada pada kuesioner ini` },
        { status: 400 },
      );
    }
  }

  const deleteIds = [...existingIds].filter((qid) => !keepIds.has(qid));

  await prisma.$transaction(async (tx) => {
    await tx.questionnaireQuestion.deleteMany({
      where: { questionnaireId: id, id: { in: deleteIds } },
    });

    for (let i = 0; i < normalized.length; i += 1) {
      const q = normalized[i];
      const data = {
        order: i,
        type: q.type,
        label: q.label,
        description: q.description,
        options: q.options === null ? undefined : (q.options as never),
        required: q.required,
      };

      if (q.id) {
        await tx.questionnaireQuestion.update({ where: { id: q.id }, data });
      } else {
        await tx.questionnaireQuestion.create({
          data: { ...data, questionnaireId: id, options: q.options === null ? undefined : (q.options as never) },
        });
      }
    }
  });

  const questions = await prisma.questionnaireQuestion.findMany({
    where: { questionnaireId: id },
    orderBy: { order: 'asc' },
  });

  return Response.json({
    success: true,
    data: {
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        label: q.label,
        description: q.description,
        options: q.options,
        required: q.required,
        order: q.order,
      })),
    },
  });
}
