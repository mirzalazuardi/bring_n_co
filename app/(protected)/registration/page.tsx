import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromPrismaClassGroup } from '@/lib/validations/registration';
import { RegistrationForm } from '@/components/RegistrationForm';
import { UserCheck } from 'lucide-react';

export const metadata = {
  title: 'Reunion Registration | Silver Reunion',
};

export default async function RegistrationPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !(session.user as { id?: string }).id) {
    redirect('/login?callbackUrl=/registration');
  }

  const userId = (session.user as { id: string }).id;

  const registration = await prisma.registration.findUnique({
    where: { userId },
  });

  const formattedData = registration
    ? {
        id: registration.id,
        jerseySize: registration.jerseySize,
        classGroup: fromPrismaClassGroup(registration.classGroup),
        phone: registration.phone,
        bankTransferProofUrl: registration.bankTransferProofUrl,
        status: registration.status,
        notes: registration.notes,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <UserCheck className="w-6 h-6 text-slate-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            Reunion Registration
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Welcome, {session.user.name || session.user.email}! Please provide your jersey sizing and payment confirmation below.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <RegistrationForm initialData={formattedData} />
        </div>
      </div>
    </div>
  );
}
