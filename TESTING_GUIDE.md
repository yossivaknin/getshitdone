# Testing Google Calendar Integration

## Step-by-Step Test Guide

### 1. Verify Connection
1. Go to `/settings`
2. Make sure you see "Connected" status (green checkmark)
3. If not connected, click "Connect Google Calendar" and complete OAuth

### 2. Test Scheduling a Task

**Option A: Schedule from Task Card**
1. Go to home page (`/`)
2. Hover over any task card that has a duration (e.g., "Figure out the link for multi-user workspaces" - 30m)
3. Click the calendar icon button that appears on hover
4. You should see a success toast: "Successfully scheduled X event(s) in your calendar"

**Option B: Schedule from Edit Dialog**
1. Click on any task card to open the edit dialog
2. Make sure the task has a duration set
3. Click the "Schedule" button in the dialog
4. You should see a success message

### 3. Verify in Google Calendar
1. Open [Google Calendar](https://calendar.google.com)
2. Look for events named: `[Focus] Task Name` or `[Focus] Task Name (Part X/Y)`
3. Events should be scheduled during working hours (9am-6pm by default)
4. Check that the times don't conflict with existing events

### 4. Test Smart Scheduling Features

**Test 1: Single Hour Task (≤ 1 hour)**
- Create/edit a task with 30 minutes duration
- Schedule it
- Should create 1 event: `[Focus] Task Name`

**Test 2: Multi-Hour Task (> 1 hour)**
- Create/edit a task with 2.5 hours duration
- Schedule it
- Should create 3 events:
  - `[Focus] Task Name (Part 1/3)`
  - `[Focus] Task Name (Part 2/3)`
  - `[Focus] Task Name (Part 3/3)`

**Test 3: No Available Slots**
- Create a task with a very short due date and long duration
- If no slots are available, you should see: "Not enough time available before due date. Please adjust date or duration."

### Troubleshooting

**Issue: "Google Calendar not connected"**
- Go to `/settings` and verify connection status
- If not connected, reconnect
- Check browser console for errors

**Issue: "Failed to schedule task"**
- Check browser console for detailed error
- Verify token is stored: Open browser DevTools → Application → Local Storage → Check for `google_calendar_token`
- Token may have expired - try reconnecting

**Issue: Events not appearing in Google Calendar**
- Check if events were created but in a different calendar
- Verify you're looking at the correct date range
- Check Google Calendar settings for the calendar you're viewing

