import { AdminGalleryManager } from '@/components/AdminGalleryManager';
import { Images } from 'lucide-react';

export const metadata = {
  title: 'Kelola Galeri | Admin Panitia',
};

/**
 * Admin gallery management — view all published photos and batch-delete.
 * Access is gated by middleware Basic Auth.
 */
export default function AdminGalleryPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800">
            <Images className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
              Kelola Galeri
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pilih beberapa foto lalu hapus sekaligus — berkas storage ikut dibersihkan
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-6 shadow-sm">
          <AdminGalleryManager />
        </div>
      </div>
    </div>
  );
}
