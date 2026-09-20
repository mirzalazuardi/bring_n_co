import { env } from '@/lib/env';

/**
 * Community upload availability gate — relative to the reunion event date.
 *
 * Uploads open `UPLOAD_OPEN_HOURS_AFTER_EVENT` hours after `EVENT_DATE`
 * (the countdown target). Example: event starts 14 Nov 2026 10:00 WIB and
 * the variable is `5` → community uploads open 15:00 WIB that day.
 *
 * Everything community-facing is gated: the gallery CTAs, the top-bar
 * "Unggah" links, the `/upload` page, and the community upload APIs.
 * The admin console's upload (`/admin/upload` → `/api/admin/images/upload`)
 * is intentionally NOT gated — committee members add photos regardless.
 *
 * Decisions are always computed server-side and passed to client components
 * as props, so client clocks and hydration mismatches never affect the gate.
 * An unset variable, unparseable event date, or negative hours all fail
 * open (uploads stay available).
 */

/** Milliseconds in one hour. */
const HOUR_MS = 60 * 60 * 1000;

/** The moment community uploads open (event date + offset), or null when no valid gate exists. */
export function getUploadOpenAt(): Date | null {
  const hours = env.UPLOAD_OPEN_HOURS_AFTER_EVENT;
  if (hours === undefined || hours < 0) return null;

  const event = new Date(env.EVENT_DATE);
  if (Number.isNaN(event.getTime())) return null;

  return new Date(event.getTime() + hours * HOUR_MS);
}

/**
 * True when community uploads are open: no gate configured (unset/unparseable),
 * or `now` has reached the opening moment (event date + configured hours).
 */
export function isUploadOpen(now: Date = new Date()): boolean {
  const openAt = getUploadOpenAt();
  if (!openAt) return true;
  return now.getTime() >= openAt.getTime();
}

/** Human-readable opening time (WIB) for "not open yet" notices, or null. */
export function formatUploadOpenAt(): string | null {
  const openAt = getUploadOpenAt();
  if (!openAt) return null;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(openAt);
}

/** API-facing reason string for closed upload routes. */
export const UPLOAD_CLOSED_MESSAGE = 'Photo uploads are not open yet. Please check back later.';
