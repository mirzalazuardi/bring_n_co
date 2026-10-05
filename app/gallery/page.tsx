import { prisma } from '@/lib/prisma';
import { GallerySlideshow, type GalleryItem } from '@/components/GallerySlideshow';
import { isUploadOpen, formatUploadOpenAt } from '@/lib/upload-window';
import { Images } from 'lucide-react';

export const revalidate = 60;

export const metadata = {
  title: 'Galeri Komunitas | SMA Negeri 14 Bandung',
};

export default async function GalleryPage() {
  // Upload CTAs are server-gated by UPLOAD_OPEN_AT (fail-open when unset).
  const uploadOpen = isUploadOpen();
  const uploadOpenAt = formatUploadOpenAt();

  let images: GalleryItem[] = [];

  try {
    const records = await prisma.image.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      take: 50,
    });

    images = records.map((img) => ({
      id: img.id,
      url: img.url,
      title: img.title,
      description: img.description,
      createdAt: img.createdAt.toISOString(),
      user: {
        name: img.user.name,
        email: img.user.email,
      },
    }));
  } catch (error) {
    console.error('Failed to fetch gallery images from database:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 mb-4">
            <Images className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Galeri
          </h1>
        </div>

        <GallerySlideshow images={images} uploadOpen={uploadOpen} uploadOpenAt={uploadOpenAt} />
      </div>
    </div>
  );
}
