import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromPrismaClassGroup, fromPrismaJerseySize } from '@/lib/validations/registration';
import { RegistrationForm } from '@/components/RegistrationForm';
import { CopyButton } from '@/components/CopyButton';

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
          <Image
            src="/25.svg"
            alt="Logo Reuni 25 Tahun"
            width={120}
            height={120}
            className="mx-auto mb-4"
            unoptimized
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Pendaftaran Reuni
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Selamat datang, {session.user.name || session.user.email}! Silakan isi data dan konfirmasi pembayaran Anda di bawah ini.
          </p>
        </div>

        {/* Biaya Pendaftaran */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Biaya Pendaftaran</h2>
          <div className="space-y-2 mb-4">
            {/* Early bird — eye-catching */}
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 dark:from-amber-500 dark:to-orange-500 px-4 py-3 shadow-sm">
              <div>
                <span className="block text-xs font-bold text-white/80 uppercase tracking-wide">Early Bird</span>
                <span className="text-sm font-semibold text-white">5 – 18 Okt 2026</span>
              </div>
              <span className="text-lg font-extrabold text-white">Rp 150.000</span>
            </div>
            <div className="flex justify-between text-sm px-1">
              <span className="text-gray-600 dark:text-gray-400">19 – 31 Okt 2026</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Rp 175.000</span>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sudah termasuk:</p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 list-disc list-inside mb-4">
            <li>Jersey Exclusive 25thn</li>
            <li>Lanyard + ID Card</li>
            <li>Merchandise</li>
            <li>Makan Siang</li>
          </ul>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transfer ke:</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                BCA 7771217234 a/n SITI SAPTINI
              </span>
              <CopyButton text="7771217234" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm">
          <RegistrationForm initialData={formattedData} initialName={session.user.name} />
        </div>
      </div>
    </div>
  );
}
