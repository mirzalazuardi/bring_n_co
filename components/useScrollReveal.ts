'use client';

import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  /** True once the element has entered the viewport (or immediately under reduced motion). Flips at most once. */
  revealed: boolean;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const THRESHOLD = 0.15;
const ROOT_MARGIN = '0px 0px -10% 0px';

/**
 * Zero-dependency scroll reveal. Observes the referenced element and flips
 * `revealed` once — and only once — when 15% of it enters the viewport
 * (with a 10% bottom inset so reveal starts just before full entry).
 * The observer disconnects after the first intersection.
 *
 * Under `prefers-reduced-motion: reduce` the hook reports `revealed: true`
 * immediately so content is never hidden from motion-sensitive users.
 */
export function useScrollReveal(): UseScrollRevealReturn {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: THRESHOLD, rootMargin: ROOT_MARGIN },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}
