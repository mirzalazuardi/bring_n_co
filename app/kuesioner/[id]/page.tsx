import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkQuestionnaireAccess } from '@/lib/questionnaire/access';
import { QuestionnaireForm, type PublicQuestion } from '@/components/QuestionnaireForm';
import Link from 'next/link';
import { ClipboardList, Lock } from 'lucide-react';

export const metadata = {
  title: 'Isi Kuesioner | SMA Negeri 14 Bandung',
};

export const dynamic = 'force-dynamic';

export default async function QuestionnaireFillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!session || !session.user || !userId) {
    redirect(`/login?callbackUrl=/kuesioner/${id}`);
  }

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!questionnaire) {
    return (
      <GateNotice
        title="Kuesioner tidak ditemukan"
        message="Tautan kuesioner tidak valid. Silakan scan ulang QR dari panitia."
        icon="default"
      />
    );
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
    const message =
      gate.reason === 'UNAUTHENTICATED'
        ? 'Silakan masuk terlebih dahulu untuk mengisi kuesioner.'
        : gate.reason === 'NOT_VERIFIED'
          ? 'Kuesioner ini hanya untuk alumni yang pendaftarannya sudah terverifikasi. Silakan buka halaman Pendaftaran untuk menyelesaikan verifikasi.'
          : 'Kuesioner ini sudah ditutup oleh panitia. Terima kasih atas kontribusinya.';

    return (
      <GateNotice
        title={gate.reason === 'CLOSED' ? 'Kuesioner Ditutup' : 'Belum Bisa Mengisi'}
        message={message}
        icon={gate.reason === 'NOT_VERIFIED' ? 'lock' : 'default'}
        showRegistrationLink={gate.reason === 'NOT_VERIFIED'}
      />
    );
  }

  const storedAnswers = await prisma.questionnaireAnswer.findMany({
    where: { questionnaireId: id, userId },
  });

  const initialAnswers = Object.fromEntries(
    storedAnswers.map((a): [string, string | number] => {
      if (a.numberValue !== null) return [a.questionId, a.numberValue];
      return [a.questionId, a.choiceValue ?? a.textValue ?? ''];
    }),
  );

  const questions: PublicQuestion[] = questionnaire.questions.map((q) => ({
    id: q.id,
    type: q.type,
    label: q.label,
    description: q.description,
    required: q.required,
    options: q.options ?? null,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 mb-4">
            <ClipboardList className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {questionnaire.title}
          </h1>
          {questionnaire.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{questionnaire.description}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Halo, {session.user.name || session.user.email}! Jawaban terkirim bisa kamu perbaiki selama kuesioner masih dibuka.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm">
          <QuestionnaireForm
            questionnaireId={questionnaire.id}
            questions={questions}
            initialAnswers={initialAnswers}
            resultsUrl={questionnaire.resultsPublished ? `/kuesioner/${questionnaire.id}/hasil` : null}
          />
        </div>
      </div>
    </div>
  );
}

function GateNotice({
  title,
  message,
  icon,
  showRegistrationLink = false,
}: {
  title: string;
  message: string;
  icon: 'lock' | 'default';
  showRegistrationLink?: boolean;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 mb-4">
            {icon === 'lock' ? (
              <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            ) : (
              <ClipboardList className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            )}
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{message}</p>
          {showRegistrationLink && (
            <Link href="/registration" className="btn-primary inline-flex mt-6 text-sm px-4 py-2.5">
              Buka Pendaftaran
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
