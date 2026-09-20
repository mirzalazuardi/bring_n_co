import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ImageUploader } from '@/components/ImageUploader';
import { env } from '@/lib/env';
import { isUploadOpen, formatUploadOpenAt } from '@/lib/upload-window';
import { ImagePlus, Clock } from 'lucide-react';

export const metadata = {
  title: 'Unggah Kenangan | SMA Negeri 14 Bandung',
};

export default async function UploadPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login?callbackUrl=/upload');
  }

  // Server-computed gate mirroring the gallery/nav CTAs (and the API guard).
  const uploadOpen = isUploadOpen();
  const uploadOpenAt = formatUploadOpenAt();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 mb-4">
            <ImagePlus className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Bagikan Kenangan Reuni
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Unggah foto masa SMA atau momen kumpul terkini. Foto dioptimalkan otomatis agar cepat ditampilkan di galeri komunitas.
          </p>
        </div>

        {uploadOpen ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm">
            <ImageUploader maxSizeMb={env.MAX_IMAGE_SIZE_MB} />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 sm:p-10 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 mb-4">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Unggah foto belum dibuka
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Upload foto kenangan dibuka{' '}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {uploadOpenAt ?? 'pada tanggal yang akan diumumkan panitia'}
              </span>
              . Panitia sudah bisa menambahkan foto melalui konsol admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
