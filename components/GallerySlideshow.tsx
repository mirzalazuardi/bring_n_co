'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play, Pause, Image as ImageIcon } from 'lucide-react';

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

interface GallerySlideshowProps {
  images: GalleryItem[];
}

export function GallerySlideshow({ images }: GallerySlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const total = images.length;

  const nextSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-advance timer every 4,000 ms (~4 seconds)
  useEffect(() => {
    if (!isPlaying || total <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 4000);

    return () => clearInterval(timer);
  }, [isPlaying, nextSlide, total]);

  if (total === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto">
        <ImageIcon className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-200">No Memories Uploaded Yet</h3>
        <p className="text-sm text-slate-400 mt-1 mb-6">
          Be the first alumni to share high school photos and reunion moments.
        </p>
        <a
          href="/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-200 text-slate-950 text-sm font-semibold rounded-xl hover:bg-white transition-colors"
        >
          Upload First Photo
        </a>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div
      className="relative max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl group"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* Slideshow Display Area */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-black flex items-center justify-center overflow-hidden">
        {/*
          Using unoptimized={true} to strictly guarantee ZERO usage against
          Vercel Hobby plan's 5,000 monthly image transformation quota.
        */}
        <Image
          src={currentImage.url}
          alt={currentImage.title || 'Reunion Memory'}
          fill
          unoptimized
          priority
          sizes="(max-width: 1024px) 100vw, 900px"
          className="object-contain transition-all duration-500"
        />

        {/* Counter Badge */}
        <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-slate-200 border border-slate-800">
          {currentIndex + 1} / {total}
        </div>

        {/* Navigation Arrow Controls */}
        {total > 1 && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white border border-slate-800 transition-all opacity-80 hover:opacity-100 hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white border border-slate-800 transition-all opacity-80 hover:opacity-100 hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Metadata and Controls Bar */}
      <div className="p-4 sm:p-6 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            {currentImage.title || 'Untitled Memory'}
          </h2>
          {currentImage.description && (
            <p className="text-sm text-slate-400 mt-0.5">{currentImage.description}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Shared by {currentImage.user.name || 'Alumni'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {total > 1 && (
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  Pause Auto-Play
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  Resume Auto-Play
                </>
              )}
            </button>
          )}
          <a
            href="/upload"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-slate-200 hover:bg-white transition-colors"
          >
            Add Photo
          </a>
        </div>
      </div>
    </div>
  );
}
