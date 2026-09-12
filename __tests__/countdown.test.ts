import { describe, it, expect } from 'vitest';
import { calculateTimeRemaining } from '../lib/countdown';

describe('Event Countdown Logic', () => {
  it('should calculate remaining time for future date', () => {
    // 25 hours and 10 seconds ahead
    const futureDate = new Date(Date.now() + 1000 * (60 * 60 * 25 + 10)).toISOString();
    const remaining = calculateTimeRemaining(futureDate);

    expect(remaining.hasStarted).toBe(false);
    expect(remaining.days).toBe(1);
    expect(remaining.hours).toBe(1);
  });

  it('should mark as started if date is in the past', () => {
    const pastDate = new Date(Date.now() - 1000 * 60).toISOString();
    const remaining = calculateTimeRemaining(pastDate);

    expect(remaining.hasStarted).toBe(true);
    expect(remaining.days).toBe(0);
    expect(remaining.hours).toBe(0);
  });

  it('should handle invalid date string gracefully', () => {
    const remaining = calculateTimeRemaining('invalid-date-string');
    expect(remaining.hasStarted).toBe(true);
  });
});
