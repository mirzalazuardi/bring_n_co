import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UploadForm } from '@/components/UploadForm';
import { ImagePlus } from 'lucide-react';

export const metadata = {
  title: 'Upload Memories | Silver Reunion',
};

export default async function UploadPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login?callbackUrl=/upload');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <ImagePlus className="w-6 h-6 text-slate-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            Share Reunion Memories
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Upload vintage high school photographs or recent get-together snapshots to display in the live community gallery.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <UploadForm />
        </div>
      </div>
    </div>
  );
}
