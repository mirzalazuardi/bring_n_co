'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Image as ImageIcon,
  LayoutGrid,
  Rows3,
  GalleryHorizontalEnd,
  Images,
} from 'lucide-react';

export interface GalleryItem {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  createdAt: string | Date;
  user: {
    name: string | null;
    email: string | null;
  };
}

type ViewMode = 'carousel' | 'grid' | 'scroll' | 'thumbnails';

interface GallerySlideshowProps {
  images: GalleryItem[];
  /** Server-computed upload-availability gate (event date + configured offset). */
  uploadOpen?: boolean;
  /** Preformatted WIB opening time for the closed notice, or null. */
  uploadOpenAt?: string | null;
}

export function GallerySlideshow({
  images,
  uploadOpen = true,
  uploadOpenAt = null,
}: GallerySlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('carousel');

  const total = images.length;

  const nextSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (!isPlaying || total <= 1 || viewMode === 'grid') return;

    const timer = setInterval(() => {
      nextSlide();
    }, 4000);

    return () => clearInterval(timer);
  }, [isPlaying, nextSlide, total, viewMode]);

  if (total === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm">
        <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Belum Ada Kenangan yang Diunggah</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
          Jadilah alumni pertama yang berbagi foto masa SMA dan momen reuni.
        </p>
        {uploadOpen ? (
          <a
            href="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors"
          >
            Unggah Foto Pertama
          </a>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Unggah foto dibuka {uploadOpenAt ?? 'pada tanggal yang diumumkan panitia'}.
          </p>
        )}
      </div>
    );
  }

  const viewModes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'carousel', icon: <GalleryHorizontalEnd className="w-4 h-4" />, label: 'Carousel' },
    { mode: 'grid', icon: <LayoutGrid className="w-4 h-4" />, label: 'Grid' },
    { mode: 'scroll', icon: <Rows3 className="w-4 h-4" />, label: 'Scroll' },
    { mode: 'thumbnails', icon: <Images className="w-4 h-4" />, label: 'Thumbnail' },
  ];

  return (
    <div className="space-y-4">
      {/* View Mode Toggle + Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
          {viewModes.map((v) => (
            <button
              key={v.mode}
              onClick={() => {
                setViewMode(v.mode);
                setCurrentIndex(0);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === v.mode
                  ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              title={v.label}
            >
              {v.icon}
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {(viewMode === 'carousel' || viewMode === 'thumbnails') && total > 1 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-orange-500" />
                  Jeda
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-teal-500" />
                  Mainkan
                </>
              )}
            </button>
            {uploadOpen && (
              <a
                href="/upload"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors"
              >
                Tambah Foto
              </a>
            )}
          </div>
        )}

        {(viewMode === 'grid' || viewMode === 'scroll') && uploadOpen && (
          <a
            href="/upload"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors"
          >
            Tambah Foto
          </a>
        )}
      </div>

      {viewMode === 'carousel' && (
        <CarouselView
          images={images}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          nextSlide={nextSlide}
          prevSlide={prevSlide}
          total={total}
        />
      )}

      {viewMode === 'grid' && (
        <GridView images={images} />
      )}

      {viewMode === 'scroll' && (
        <HorizontalScrollView images={images} />
      )}

      {viewMode === 'thumbnails' && (
        <ThumbnailsView
          images={images}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          nextSlide={nextSlide}
          prevSlide={prevSlide}
          total={total}
        />
      )}
    </div>
  );
}

function CarouselView({
  images,
  currentIndex,
  nextSlide,
  prevSlide,
  total,
}: {
  images: GalleryItem[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  nextSlide: () => void;
  prevSlide: () => void;
  total: number;
}) {
  const currentImage = images[currentIndex];

  return (
    <div className="relative max-w-4xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm group">
      <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
        <Image
          src={currentImage.url}
          alt={currentImage.title || 'Kenangan Reuni'}
          fill
          unoptimized
          priority
          sizes="(max-width: 1024px) 100vw, 900px"
          className="object-contain transition-all duration-500"
        />

        <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          {currentIndex + 1} / {total}
        </div>

        {total > 1 && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Sebelumnya"
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Selanjutnya"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {currentImage.title || 'Tanpa Judul'}
        </h2>
        {currentImage.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{currentImage.description}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Dibagikan oleh {currentImage.user.name || 'Alumni'}
        </p>
      </div>
    </div>
  );
}

function GridView({ images }: { images: GalleryItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {images.map((img) => (
        <div
          key={img.id}
          className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all cursor-pointer"
        >
          <Image
            src={img.url}
            alt={img.title || 'Kenangan Reuni'}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white text-sm font-semibold truncate">
                {img.title || 'Tanpa Judul'}
              </p>
              <p className="text-white/70 text-xs truncate">
                {img.user.name || 'Alumni'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HorizontalScrollView({ images }: { images: GalleryItem[] }) {
  return (
    <div className="relative">
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {images.map((img) => (
          <div
            key={img.id}
            className="flex-none w-[280px] sm:w-[320px] snap-center"
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-900">
                <Image
                  src={img.url}
                  alt={img.title || 'Kenangan Reuni'}
                  fill
                  unoptimized
                  sizes="320px"
                  className="object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {img.title || 'Tanpa Judul'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {img.user.name || 'Alumni'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent pointer-events-none sm:hidden" />
    </div>
  );
}

function ThumbnailsView({
  images,
  currentIndex,
  setCurrentIndex,
  nextSlide,
  prevSlide,
  total,
}: {
  images: GalleryItem[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  nextSlide: () => void;
  prevSlide: () => void;
  total: number;
}) {
  const currentImage = images[currentIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm group">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
          <Image
            src={currentImage.url}
            alt={currentImage.title || 'Kenangan Reuni'}
            fill
            unoptimized
            priority
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-contain transition-all duration-500"
          />

          <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
            {currentIndex + 1} / {total}
          </div>

          {total > 1 && (
            <>
              <button
                onClick={prevSlide}
                aria-label="Sebelumnya"
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextSlide}
                aria-label="Selanjutnya"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {currentImage.title || 'Tanpa Judul'}
          </h2>
          {currentImage.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{currentImage.description}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Dibagikan oleh {currentImage.user.name || 'Alumni'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setCurrentIndex(idx)}
            className={`flex-none w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all snap-center ${
              idx === currentIndex
                ? 'border-teal-500 ring-2 ring-teal-200 dark:ring-teal-800 scale-105'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900">
              <Image
                src={img.url}
                alt={img.title || 'Thumbnail'}
                fill
                unoptimized
                sizes="80px"
                className="object-cover"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
