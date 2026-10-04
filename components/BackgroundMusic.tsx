'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const TRACK_SRC = '/audio/yura_bandung.mp3';

/**
 * Site-wide background music ("Yura Bandung").
 *
 * Autoplay is attempted on mount; when the browser blocks it (no user gesture
 * yet), playback starts on the visitor's first pointer/keyboard interaction.
 * A floating toggle lets visitors mute/unmute at any time. The <audio> element
 * lives in the root layout, so playback continues across client-side
 * navigation.
 *
 * Hydration safety: the server and first client render output identical
 * markup (`playing=false`); every state change happens after mount or in
 * event handlers.
 */
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Fallback when autoplay is blocked: start on the visitor's first
    // interaction. Listeners are added only if the autoplay attempt rejects,
    // and removed once playback starts or the component unmounts.
    const startOnGesture = () => {
      if (audio.paused) {
        audio.play().catch(() => {
          // Still blocked (should not happen after a real gesture) — give up
          // quietly; the visitor can use the toggle button.
        });
      }
    };

    const onPlaying = () => {
      setPlaying(true);
      window.removeEventListener('pointerdown', startOnGesture);
      window.removeEventListener('keydown', startOnGesture);
    };
    const onPause = () => setPlaying(false);

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);

    // Attempt autoplay; browsers without a prior gesture may reject it.
    audio.volume = 0.6;
    audio.play().catch(() => {
      window.addEventListener('pointerdown', startOnGesture);
      window.addEventListener('keydown', startOnGesture);
    });

    return () => {
      window.removeEventListener('pointerdown', startOnGesture);
      window.removeEventListener('keydown', startOnGesture);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.pause();
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => {
        // Cannot start (rare after an explicit click) — icon stays muted.
      });
    } else {
      audio.pause();
    }
  };

  return (
    <>
      <audio ref={audioRef} src={TRACK_SRC} preload="none" loop className="hidden" />

      <button
        type="button"
        onClick={toggle}
        title={playing ? 'Matikan Musik' : 'Nyalakan Musik'}
        aria-label={playing ? 'Matikan musik latar' : 'Nyalakan musik latar'}
        className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-11 h-11 rounded-full border border-stone-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 text-stone-600 dark:text-gray-300 shadow-md hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-300 dark:hover:border-teal-600 transition-colors"
      >
        {playing ? (
          <>
            <Volume2 className="w-5 h-5" />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-teal-400 dark:border-teal-500 animate-ping opacity-30"
            />
          </>
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>
    </>
  );
}
