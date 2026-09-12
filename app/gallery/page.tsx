import { prisma } from '@/lib/prisma';
import { GallerySlideshow, type GalleryItem } from '@/components/GallerySlideshow';
import { Images } from 'lucide-react';

export const revalidate = 60; // Cache for 60s to stay well within Vercel Hobby invocation limits

export const metadata = {
  title: 'Community Gallery | Silver Reunion',
};

export default async function GalleryPage() {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <Images className="w-6 h-6 text-slate-300" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            Silver Reunion Gallery
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            A nostalgic showcase of memories contributed by alumni across all classes. Auto-advances every ~4 seconds.
          </p>
        </div>

        <GallerySlideshow images={images} />
      </div>
    </div>
  );
}
