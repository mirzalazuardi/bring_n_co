'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Clock } from 'lucide-react';
import { calculateTimeRemaining, type TimeRemaining } from '@/lib/countdown';

interface EventCountdownProps {
  targetDate?: string;
}

export function EventCountdown({
  targetDate = process.env.NEXT_PUBLIC_EVENT_DATE || '2026-12-31T18:00:00+07:00',
}: EventCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(targetDate)
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!mounted) {
    // Avoid hydration mismatch while maintaining layout space
    return (
      <div className="flex items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl max-w-2xl mx-auto shadow-2xl">
        <div className="flex gap-4 sm:gap-6">
          {['Days', 'Hours', 'Minutes', 'Seconds'].map((label) => (
            <div
              key={label}
              className="flex flex-col items-center bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 min-w-[72px] sm:min-w-[96px]"
            >
              <span className="text-2xl sm:text-4xl font-extrabold text-slate-100">--</span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (timeLeft.hasStarted) {
    return (
      <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/50 rounded-3xl p-8 max-w-2xl mx-auto text-center shadow-2xl backdrop-blur-sm">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-500/20 text-amber-300 mb-3">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-200">
          The Silver Reunion Has Started!
        </h2>
        <p className="text-sm text-amber-300/80 mt-2">
          Welcome back alumni! Head over to the venue and let the celebrations begin.
        </p>
      </div>
    );
  }

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <div className="flex flex-col items-center bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">
        <Clock className="w-4 h-4 text-slate-400" />
        Countdown to Reunion Night
      </div>

      <div className="grid grid-cols-4 gap-3 sm:gap-6">
        {timeUnits.map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3 py-3 sm:px-6 sm:py-5 min-w-[68px] sm:min-w-[100px] shadow-inner"
          >
            <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-100 tabular-nums">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 sm:mt-2">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
