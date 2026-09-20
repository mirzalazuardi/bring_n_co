'use client';

import React, { useState, useEffect } from 'react';
import { calculateTimeRemaining, type TimeRemaining } from '@/lib/countdown';

interface EventCountdownProps {
  targetDate?: string;
}

export function EventCountdown({
  targetDate = process.env.NEXT_PUBLIC_EVENT_DATE || '2026-11-14T10:00:00+07:00',
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
    return (
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-stone-200 dark:border-gray-700 p-6 sm:p-8">
        <div className="grid grid-cols-4 gap-3">
          {['Hari', 'Jam', 'Menit', 'Detik'].map((label) => (
            <div key={label} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-stone-200 dark:text-gray-600 tabular-nums">
                --
              </div>
              <div className="text-xs font-medium text-stone-300 dark:text-gray-600 mt-1 uppercase tracking-wide">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (timeLeft.hasStarted) {
    return (
      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-200 dark:border-teal-800 p-6 sm:p-8 text-center">
        <div className="text-3xl sm:text-4xl font-black text-teal-700 dark:text-teal-300 mb-2">
          🎉
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-teal-800 dark:text-teal-200">
          Reuni sudah dimulai!
        </h2>
        <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
          Segera menuju venue dan rayakan bersama.
        </p>
      </div>
    );
  }

  const timeUnits = [
    { label: 'Hari', value: timeLeft.days },
    { label: 'Jam', value: timeLeft.hours },
    { label: 'Menit', value: timeLeft.minutes },
    { label: 'Detik', value: timeLeft.seconds },
  ];

  return (
    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-stone-200 dark:border-gray-700 p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-gray-500 mb-4">
        Hitung Mundur
      </p>
      <div className="grid grid-cols-4 gap-3">
        {timeUnits.map((unit) => (
          <div key={unit.label} className="text-center">
            <div className="text-3xl sm:text-5xl font-black text-stone-900 dark:text-gray-100 tabular-nums leading-none">
              {String(unit.value).padStart(2, '0')}
            </div>
            <div className="text-xs font-medium text-stone-400 dark:text-gray-500 mt-2 uppercase tracking-wide">
              {unit.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
