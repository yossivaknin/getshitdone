# Working Hours Debug Guide

## Where Working Hours Are Defined

### 1. **Settings Page** (`src/app/settings/page.tsx`)
- **Storage**: `localStorage.getItem('working_hours_start')` and `localStorage.getItem('working_hours_end')`
- **Default**: `'09:00'` and `'18:00'`
- **User can change**: Yes, in Settings page
- **Lines**: ~20-28, ~465-493

### 2. **Schedule Task Action** (`src/app/actions.ts`)
- **Source Priority**:
  1. Function parameters: `workingHoursStart` and `workingHoursEnd` (if provided)
  2. Defaults: `'09:00'` and `'18:00'`
- **Lines**: ~532-545
- **Note**: This is where working hours are passed to the scheduling logic

### 3. **Calendar Config** (`src/lib/calendar.ts`)
- **Interface**: `CalendarConfig` contains `workingHoursStart` and `workingHoursEnd`
- **Format**: String in "HH:MM" format (e.g., "09:00", "18:00")
- **Lines**: ~18-19

### 4. **Find Free Slots** (`src/lib/calendar.ts`)
- **Function**: `findFreeSlots()`
- **Parameters**: `workingHoursStart: string`, `workingHoursEnd: string`
- **Usage**: Filters available slots to only include times within working hours
- **Lines**: ~289-291, ~395
- **Timezone**: Uses `Intl.DateTimeFormat().resolvedOptions().timeZone` or defaults to `'America/New_York'`
- **Lines**: ~293-295

### 5. **Smart Schedule** (`src/lib/smart-schedule.ts`)
- **Function**: `smartSchedule()`
- **Config**: Receives `CalendarConfig` with working hours
- **Usage**: Ensures all scheduled chunks are within working hours
- **Lines**: ~148, ~178-179, ~210-211, ~274-275

### 6. **Create Calendar Event** (`src/lib/calendar.ts`)
- **Function**: `createCalendarEvent()`
- **Validation**: Checks that event start/end are within working hours
- **Lines**: ~559-580
- **Timezone**: Uses `Intl.DateTimeFormat().resolvedOptions().timeZone` for validation
- **Lines**: ~563-566

## How Working Hours Flow

```
User sets in Settings
  ↓
Saved to localStorage ('working_hours_start', 'working_hours_end')
  ↓
Read from localStorage when scheduling (TaskCard, EditTaskDialog, CreateTaskDialog)
  ↓
Passed to scheduleTask() action as parameters
  ↓
Used in CalendarConfig
  ↓
Passed to findFreeSlots() and smartSchedule()
  ↓
Used to filter available time slots
```

## Console Logging Added

### When Scheduling Starts (`src/app/actions.ts`)
- Logs: Working hours source (parameters/localStorage/defaults)
- Logs: Actual working hours values being used

### In Find Free Slots (`src/lib/calendar.ts`)
- Logs: Working hours from parameters
- Logs: User timezone
- Logs: Search range in both UTC and local time
- Logs: **ALL available slots found** with:
  - UTC time
  - Local time (in user's timezone)
  - Duration
- Logs: Summary of all free slots at the end

### In Smart Schedule (`src/lib/smart-schedule.ts`)
- Logs: Working hours from config
- Logs: All busy slots to avoid
- Logs: Available slots for each chunk
- Logs: Selected slot with UTC and local time

## How to Debug

1. **Check browser console** when scheduling a task
2. **Look for logs starting with**:
   - `[SCHEDULE]` - Initial scheduling setup
   - `[FREESLOTS]` - Available slots found
   - `[SMART-SCHEDULE]` - Chunk scheduling logic
   - `[EVENT]` - Calendar event creation

3. **Key things to check**:
   - Are working hours correct? (should be 09:00-18:00 for NY)
   - What timezone is being used? (should be America/New_York)
   - Are slots being found? (check the summary)
   - Are slots in the correct time range? (check local time vs UTC)

## Common Issues

1. **Working hours in UTC instead of local time**
   - Check timezone logs - should show `America/New_York`
   - Check if `getLocalTime()` is being used for validation

2. **Slots found but wrong time**
   - Check UTC vs local time in logs
   - Verify timezone conversion is working

3. **No slots found**
   - Check if working hours are too restrictive
   - Check if calendar is completely booked
   - Check if time range is too short

