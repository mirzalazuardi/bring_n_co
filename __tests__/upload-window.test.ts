import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const NOW = new Date('2026-11-14T08:00:00Z'); // fixed "current time"
const EVENT = '2026-11-14T10:00:00+07:00'; // = 2026-11-14T03:00:00Z
const HOUR = 60 * 60 * 1000;

vi.mock('../lib/env', () => ({
  env: {
    // Inlined (not the EVENT const) because vi.mock factories are hoisted.
    EVENT_DATE: '2026-11-14T10:00:00+07:00',
    UPLOAD_OPEN_HOURS_AFTER_EVENT: undefined as number | undefined,
  },
}));

import {
  getUploadOpenAt,
  isUploadOpen,
  formatUploadOpenAt,
  UPLOAD_CLOSED_MESSAGE,
} from '../lib/upload-window';
import { env } from '../lib/env';

function setGate(hours: number | undefined) {
  (env as { UPLOAD_OPEN_HOURS_AFTER_EVENT: number | undefined }).UPLOAD_OPEN_HOURS_AFTER_EVENT =
    hours;
}

describe('upload window gate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fails open when the gate is not configured', () => {
    setGate(undefined);
    expect(getUploadOpenAt()).toBeNull();
    expect(isUploadOpen()).toBe(true);
    expect(formatUploadOpenAt()).toBeNull();
  });

  it('fails open when the event date is unparseable', () => {
    setGate(5);
    (env as { EVENT_DATE: string }).EVENT_DATE = 'not-a-date';
    expect(getUploadOpenAt()).toBeNull();
    expect(isUploadOpen()).toBe(true);
    (env as { EVENT_DATE: string }).EVENT_DATE = EVENT;
  });

  it('fails open on negative hours (misconfiguration)', () => {
    setGate(-1);
    expect(getUploadOpenAt()).toBeNull();
    expect(isUploadOpen()).toBe(true);
  });

  it('is closed before event date + N hours', () => {
    setGate(5);
    // Event = 03:00Z; open = 08:00Z; one millisecond before is still closed.
    expect(getUploadOpenAt()?.toISOString()).toBe('2026-11-14T08:00:00.000Z');
    expect(isUploadOpen(new Date(NOW.getTime() - 1))).toBe(false);
  });

  it('is open exactly at and after event date + N hours', () => {
    setGate(5);
    expect(isUploadOpen(NOW)).toBe(true); // exactly at the opening moment
    setGate(4);
    // Open = 07:00Z; now (08:00Z) is past it.
    expect(isUploadOpen(NOW)).toBe(true);
    expect(isUploadOpen(new Date(NOW.getTime() + HOUR))).toBe(true);
  });

  it('supports zero-hour gates (open exactly at event start)', () => {
    setGate(0);
    expect(getUploadOpenAt()?.toISOString()).toBe('2026-11-14T03:00:00.000Z');
    expect(isUploadOpen(new Date(Date.parse('2026-11-14T03:00:00.000Z') - 1))).toBe(false);
    expect(isUploadOpen(new Date('2026-11-14T03:00:00.000Z'))).toBe(true);
  });

  it('exposes an API-facing closed message', () => {
    expect(UPLOAD_CLOSED_MESSAGE).toBe('Photo uploads are not open yet. Please check back later.');
  });

  it('formats the opening time in WIB for the notice', () => {
    setGate(5);
    expect(formatUploadOpenAt()).toBe('Sabtu, 14 November 2026 pukul 15.00');
  });
});
