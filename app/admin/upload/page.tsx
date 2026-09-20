import { AdminGalleryUploader } from '@/components/AdminGalleryUploader';
import { Images } from 'lucide-react';

export const metadata = {
  title: 'Upload Galeri | Admin Panitia',
};

/**
 * Bulk gallery upload for the committee — direct publish, no optimization
 * pipeline, no Trigger.dev dependency. Access is gated by middleware Basic Auth.
 */
export default function AdminUploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800">
            <Images className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
              Upload Galeri
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Unggah banyak foto sekaligus — langsung tampil di galeri tanpa proses optimasi
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm">
          <AdminGalleryUploader />
        </div>
      </div>
    </div>
  );
}
