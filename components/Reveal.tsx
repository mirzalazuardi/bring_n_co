'use client';

import React from 'react';
import { useScrollReveal } from '@/components/useScrollReveal';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps below-fold content in a reveal-on-entrance animation.
 * Starts hidden (`.reveal`) and rises in once when 15% of it enters the
 * viewport. Reduced-motion users see content immediately (CSS guard in
 * globals.css + hook bypass in useScrollReveal).
 */
export function Reveal({ children, className = '' }: RevealProps) {
  const { ref, revealed } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`reveal ${revealed ? 'revealed' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
