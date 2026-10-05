import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromPrismaClassGroup, fromPrismaJerseySize } from '@/lib/validations/registration';
import { RegistrationForm } from '@/components/RegistrationForm';
import { UserCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pendaftaran Reuni | SMA Negeri 14 Bandung',
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
        jerseySize: fromPrismaJerseySize(registration.jerseySize),
        classGroup: fromPrismaClassGroup(registration.classGroup),
        phone: registration.phone,
        bankTransferProofUrl: registration.bankTransferProofUrl,
        status: registration.status,
        notes: registration.notes,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 mb-4">
            <UserCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Pendaftaran Reuni
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Selamat datang, {session.user.name || session.user.email}! Silakan isi ukuran jersey dan konfirmasi pembayaran Anda di bawah ini.
          </p>
        </div>

        {/* Biaya Pendaftaran */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Biaya Pendaftaran</h2>
          <div className="space-y-1 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">5 – 19 Okt 2026</span>
              <span className="font-semibold text-teal-700 dark:text-teal-400">Rp 150.000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">20 – 31 Okt 2026</span>
              <span className="font-semibold text-teal-700 dark:text-teal-400">Rp 175.000</span>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sudah termasuk:</p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 list-disc list-inside">
            <li>Jersey Exclusive 25thn</li>
            <li>Lanyard + ID Card</li>
            <li>Merchandise</li>
            <li>Makan Siang</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm">
          <RegistrationForm initialData={formattedData} />
        </div>
      </div>
    </div>
  );
}
