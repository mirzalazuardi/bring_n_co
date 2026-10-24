import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/api-guard';
import { questionnaireSettingsSchema } from '@/lib/admin/questionnaires';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/questionnaires/:id — questionnaire with its questions
 * (builder payload, answers excluded — use the stats endpoint).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  if (!questionnaire) {
    return Response.json({ success: false, error: 'Kuesioner tidak ditemukan' }, { status: 404 });
  }

  return Response.json({
    success: true,
    data: {
      id: questionnaire.id,
      title: questionnaire.title,
      description: questionnaire.description,
      isOpen: questionnaire.isOpen,
      requireVerified: questionnaire.requireVerified,
      resultsPublished: questionnaire.resultsPublished,
      questions: questionnaire.questions.map((q) => ({
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

/**
 * PATCH /api/admin/questionnaires/:id — adjust settings: the three toggles
 * (isOpen, requireVerified, resultsPublished) and/or title/description.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = questionnaireSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const existing = await prisma.questionnaire.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ success: false, error: 'Kuesioner tidak ditemukan' }, { status: 404 });
  }

  const { title, description, isOpen, requireVerified, resultsPublished } = parsed.data;
  const updated = await prisma.questionnaire.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isOpen !== undefined && { isOpen }),
      ...(requireVerified !== undefined && { requireVerified }),
      ...(resultsPublished !== undefined && { resultsPublished }),
    },
  });

  return Response.json({
    success: true,
    data: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      isOpen: updated.isOpen,
      requireVerified: updated.requireVerified,
      resultsPublished: updated.resultsPublished,
    },
  });
}

/** DELETE /api/admin/questionnaires/:id — cascade removes questions + answers. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.questionnaire.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ success: false, error: 'Kuesioner tidak ditemukan' }, { status: 404 });
  }

  await prisma.questionnaire.delete({ where: { id } });
  return Response.json({ success: true });
}
