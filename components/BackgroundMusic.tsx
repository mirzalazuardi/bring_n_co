'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const TRACK_SRC = '/audio/yura_bandung_ori.mp3';

/**
 * Site-wide background music ("Yura Bandung").
 *
 * Autoplay strategy, hardened against browser autoplay policies:
 * 1. Audible autoplay is attempted on mount — succeeds for returning visitors
 *    or permissive browser settings.
 * 2. If the browser blocks it (no user gesture yet), playback starts muted
 *    instead — always permitted — so the track is live and buffering from
 *    page load, and the visitor's first pointer/keyboard interaction anywhere
 *    on the page unmutes it instantly.
 * A floating toggle lets visitors mute/unmute at any time. The <audio>
 * element lives in the root layout, so playback continues across client-side
 * navigation.
 *
 * Hydration safety: the server and first client render output identical
 * markup (`playing=false`); every state change happens after mount or in
 * event handlers.
 */
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // Set when the visitor pauses via the toggle, so page gestures never
  // restart the music against their explicit choice.
  const userPausedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlaying = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);

    // Unmute (or start) on the visitor's first interaction. Events targeting
    // the toggle button itself are skipped so the button keeps its own
    // pause/resume meaning.
    const unmuteOnGesture = (event: Event) => {
      const button = buttonRef.current;
      if (
        userPausedRef.current ||
        (button && event.target instanceof Node && button.contains(event.target))
      ) {
        return;
      }
      if (!audio.paused && !audio.muted) return; // already audible
      audio.muted = false;
      setMuted(false);
      if (audio.paused) {
        audio.play().catch(() => {
          // Still blocked (should not happen after a real gesture) — give up
          // quietly; the visitor can use the toggle button.
        });
      }
    };
    window.addEventListener('pointerdown', unmuteOnGesture);
    window.addEventListener('keydown', unmuteOnGesture);

    // Start muted — always permitted by browser autoplay policy.
    // The gesture listener above unmutes on first interaction.
    audio.volume = 0.6;
    audio.muted = true;
    setMuted(true);
    audio.play().catch(() => {
      // Even muted play blocked — gesture listener will start it.
    });

    return () => {
      window.removeEventListener('pointerdown', unmuteOnGesture);
      window.removeEventListener('keydown', unmuteOnGesture);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.pause();
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      userPausedRef.current = false;
      audio.muted = false;
      setMuted(false);
      audio.play().catch(() => {
        // Cannot start (rare after an explicit click) — icon stays muted.
      });
    } else if (audio.muted) {
      // Silent autoplay is running: the button unmutes it instead of pausing.
      audio.muted = false;
      setMuted(false);
    } else {
      userPausedRef.current = true;
      audio.pause();
    }
  };

  const audible = playing && !muted;

  return (
    <>
      <audio ref={audioRef} src={TRACK_SRC} preload="auto" loop className="hidden" />

      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title={audible ? 'Matikan Musik' : 'Nyalakan Musik'}
        aria-label={audible ? 'Matikan musik latar' : 'Nyalakan musik latar'}
        className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-11 h-11 rounded-full border border-stone-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 text-stone-600 dark:text-gray-300 shadow-md hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-300 dark:hover:border-teal-600 transition-colors"
      >
        {audible ? (
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
