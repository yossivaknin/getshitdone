// Timezone utilities using Luxon
// Helper functions for working with timezones in calendar operations

import { DateTime } from 'luxon';

/**
 * Get working hours window for a specific day in user's timezone
 * Returns DateTime objects in the user's timezone, ready to convert to UTC for Google API
 */
export function workingWindowForDay(
  dayISO: string, // "2025-12-14"
  tz: string, // "America/New_York"
  startHHmm: string, // "09:00"
  endHHmm: string // "18:00"
): { start: DateTime; end: DateTime } {
  const [sh, sm] = startHHmm.split(':').map(Number);
  const [eh, em] = endHHmm.split(':').map(Number);

  const day = DateTime.fromISO(dayISO, { zone: tz }).startOf('day');
  const start = day.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
  const end = day.set({ hour: eh, minute: em, second: 0, millisecond: 0 });

  return { start, end };
}

/**
 * Convert a DateTime to RFC3339 format for Google Calendar API
 */
export function toRFC3339(dt: DateTime): string {
  return dt.toUTC().toISO({ includeOffset: false }) + 'Z';
}

/**
 * Get user timezone from localStorage or default
 */
export function getUserTimezone(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('user_timezone') || 
           Intl.DateTimeFormat().resolvedOptions().timeZone || 
           'America/New_York';
  }
  // Server-side: default to NY timezone
  return 'America/New_York';
}

