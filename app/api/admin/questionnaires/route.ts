import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/api-guard';
import { z } from 'zod';
import { TITLE_MAX_LENGTH } from '@/lib/validations/questionnaire';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().trim().min(3, 'Judul minimal 3 karakter').max(TITLE_MAX_LENGTH, `Judul maksimal ${TITLE_MAX_LENGTH} karakter`),
  description: z.string().trim().max(500, 'Deskripsi maksimal 500 karakter').optional().nullable(),
});

/**
 * GET /api/admin/questionnaires — list all questionnaires with question +
 * respondent counts for the admin console list.
 */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const [questionnaires, respondentRows] = await Promise.all([
    prisma.questionnaire.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.$queryRaw<{ questionnaireId: string; respondents: number }[]>`
      SELECT "questionnaireId", COUNT(DISTINCT "userId")::int AS respondents
      FROM "questionnaire_answers"
      GROUP BY "questionnaireId"
    `,
  ]);

  const respondentsByQuestionnaire = new Map(
    respondentRows.map((r) => [r.questionnaireId, r.respondents]),
  );

  return Response.json({
    success: true,
    data: questionnaires.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      isOpen: q.isOpen,
      requireVerified: q.requireVerified,
      resultsPublished: q.resultsPublished,
      questionCount: q._count.questions,
      respondents: respondentsByQuestionnaire.get(q.id) ?? 0,
      createdAt: q.createdAt.toISOString(),
    })),
  });
}

/**
 * POST /api/admin/questionnaires — create a questionnaire. Starts closed;
 * the committee opens it (and adds questions) via the manage page.
 */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const questionnaire = await prisma.questionnaire.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
    },
  });

  return Response.json({
    success: true,
    data: { id: questionnaire.id, title: questionnaire.title },
  }, { status: 201 });
}
