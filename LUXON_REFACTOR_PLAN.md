# Luxon Refactor Plan (Based on ChatGPT's Recommendations)

## Problem
The current code uses native JavaScript `Date` methods which operate in the server's timezone (UTC), not the user's timezone. This causes tasks to be scheduled outside working hours.

## Solution
Use Luxon for all timezone operations, following ChatGPT's pattern.

## Changes Made So Far
1. ✅ Installed `luxon` package
2. ✅ Added timezone selector to settings page
3. ✅ Updated `CalendarConfig` interface to include `timezone`
4. ✅ Created `calendar-timezone.ts` helper with Luxon utilities
5. ✅ Updated `getBusySlots` to use RFC3339 format

## Remaining Work

### 1. Update `findFreeSlots` function
**File**: `src/lib/calendar.ts`

**Current**: Uses `Intl.DateTimeFormat` and manual timezone conversion
**Target**: Use Luxon's `DateTime` with proper timezone handling

**Pattern to follow**:
```typescript
import { DateTime } from 'luxon';

export function findFreeSlots(
  busySlots: TimeSlot[],
  timeMin: Date,
  timeMax: Date,
  workingHoursStart: string,
  workingHoursEnd: string,
  durationMinutes: number,
  timezone: string = 'America/New_York'
): TimeSlot[] {
  const [sh, sm] = workingHoursStart.split(':').map(Number);
  const [eh, em] = workingHoursEnd.split(':').map(Number);
  
  // Convert input dates to Luxon DateTime in user's timezone
  const timeMinDT = DateTime.fromJSDate(timeMin, { zone: timezone });
  const timeMaxDT = DateTime.fromJSDate(timeMax, { zone: timezone });
  
  // Start from now or timeMin, whichever is later
  const now = DateTime.now().setZone(timezone);
  const startFrom = timeMinDT > now ? timeMinDT : now;
  
  // Get today's date string for working hours calculation
  const todayISO = startFrom.toISODate()!;
  const { start: workStart, end: workEnd } = workingWindowForDay(todayISO, timezone, workingHoursStart, workingHoursEnd);
  
  // All slot generation should happen in user's timezone
  // Convert to UTC only when creating Date objects for return
  // ...
}
```

### 2. Update `createCalendarEvent` function
**File**: `src/lib/calendar.ts`

**Current**: Uses `Intl.DateTimeFormat` for validation
**Target**: Use Luxon and proper RFC3339 format with `timeZone` field

**Pattern to follow**:
```typescript
export async function createCalendarEvent(
  config: CalendarConfig,
  start: Date,
  end: Date,
  summary: string,
  description?: string
): Promise<string> {
  const tz = config.timezone || 'America/New_York';
  
  // Convert to Luxon DateTime in user's timezone
  const startDT = DateTime.fromJSDate(start, { zone: tz });
  const endDT = DateTime.fromJSDate(end, { zone: tz });
  
  // Validate working hours in user's timezone
  const [startHour, startMin] = config.workingHoursStart.split(':').map(Number);
  const [endHour, endMin] = config.workingHoursEnd.split(':').map(Number);
  
  const eventStartHour = startDT.hour;
  const eventStartMin = startDT.minute;
  const eventEndHour = endDT.hour;
  const eventEndMin = endDT.minute;
  
  // Validate in user's timezone
  if (eventStartHour < startHour || (eventStartHour === startHour && eventStartMin < startMin)) {
    throw new Error(`Event starts before working hours: ${eventStartHour}:${eventStartMin} (${tz})`);
  }
  
  if (eventEndHour > endHour || (eventEndHour === endHour && eventEndMin > endMin)) {
    throw new Error(`Event ends after working hours: ${eventEndHour}:${eventEndMin} (${tz})`);
  }
  
  // Create Google Calendar event with proper RFC3339 format and timeZone field
  const event = {
    summary,
    description: description || '',
    start: {
      dateTime: startDT.toISO({ includeOffset: false }) + 'Z', // RFC3339
      timeZone: tz
    },
    end: {
      dateTime: endDT.toISO({ includeOffset: false }) + 'Z', // RFC3339
      timeZone: tz
    }
  };
  
  // ... rest of API call
}
```

### 3. Update `scheduleTask` action
**File**: `src/app/actions.ts`

**Current**: Gets timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`
**Target**: Get timezone from `localStorage` (set in settings) or default

**Change**:
```typescript
// Get timezone from localStorage or default
const userTimezone = typeof window !== 'undefined' 
  ? localStorage.getItem('user_timezone') || 'America/New_York'
  : 'America/New_York';

const config: CalendarConfig = {
  accessToken: validToken,
  refreshToken: refreshToken,
  workingHoursStart: defaultStart,
  workingHoursEnd: defaultEnd,
  timezone: userTimezone // Add this
};
```

### 4. Update `smartSchedule` function
**File**: `src/lib/smart-schedule.ts`

**Current**: Uses `getHours()` which returns UTC
**Target**: Use Luxon for all timezone operations

**Already fixed**: The validation now uses timezone-aware checking, but should be updated to use Luxon throughout.

### 5. Update all callers
- `src/lib/smart-schedule.ts` - Pass timezone to `findFreeSlots`
- `src/app/actions.ts` - Pass timezone to calendar functions

## Testing Checklist
- [ ] Schedule a task and verify it's within working hours (9 AM - 6 PM in user's timezone)
- [ ] Check console logs show correct timezone
- [ ] Verify Google Calendar events have correct `timeZone` field
- [ ] Test with different timezones (NY, LA, London, etc.)
- [ ] Verify busy slot detection still works
- [ ] Verify events don't get scheduled outside working hours

## Key Principles
1. **All working hours math happens in user's timezone** (using Luxon)
2. **Convert to UTC only when calling Google API** (RFC3339 format)
3. **Google events must include `timeZone` field** (not just RFC3339)
4. **Double validation**: Check working hours when finding slots AND when creating events

