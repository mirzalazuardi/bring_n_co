import { prisma } from '@/lib/prisma';
import { buildQuestionnaireStats, type AnswerRow, type QuestionStat } from '@/lib/questionnaire/access';

/**
 * Aggregated report for the admin console (REQ-QR-004): per-question stats
 * WITH respondent names (admin only — public pages use plain aggregates).
 * Shared by the stats API route and the manage page's initial render.
 */
export interface AdminReport {
  title: string;
  isOpen: boolean;
  requireVerified: boolean;
  resultsPublished: boolean;
  totalRespondents: number;
  stats: QuestionStat[];
}

export async function buildAdminReport(questionnaireId: string): Promise<AdminReport | null> {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: questionnaireId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  if (!questionnaire) return null;

  const answerRecords = await prisma.questionnaireAnswer.findMany({
    where: { questionnaireId },
    select: {
      questionId: true,
      userId: true,
      choiceValue: true,
      numberValue: true,
      textValue: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const answers: AnswerRow[] = answerRecords.map((a) => ({
    questionId: a.questionId,
    userId: a.userId,
    respondentName: a.user.name,
    choiceValue: a.choiceValue,
    numberValue: a.numberValue,
    textValue: a.textValue,
    createdAt: a.createdAt.toISOString(),
  }));

  return {
    title: questionnaire.title,
    isOpen: questionnaire.isOpen,
    requireVerified: questionnaire.requireVerified,
    resultsPublished: questionnaire.resultsPublished,
    totalRespondents: new Set(answers.map((a) => a.userId)).size,
    stats: buildQuestionnaireStats(questionnaire.questions, answers),
  };
}
