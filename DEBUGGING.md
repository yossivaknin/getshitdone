# Debugging Google Calendar Integration

## Quick Test Steps

1. **Go to Settings page** (`/settings`)
2. **Click "Test Connection"** button (next to the Connected status)
   - This will create a test event in your calendar
   - Check your Google Calendar for an event titled "[Focus] Test Event - Please Delete"
   - If this works, the API connection is fine

3. **Check Browser Console** (F12 → Console tab)
   - Look for any red error messages
   - Look for logs starting with "Scheduling task:", "Smart scheduling:", "Creating event:"

4. **Check Server Terminal** (where `npm run dev` is running)
   - Look for logs about scheduling, token validation, and event creation
   - Look for any error messages

5. **Try Scheduling a Task**:
   - Create a task with a duration (e.g., 30 minutes)
   - Set due date to "Tomorrow"
   - Click the calendar icon (hover over the task card to see it)
   - Watch both browser console and server terminal for logs

## Common Issues

### Issue: Token Expired
**Solution**: Go to Settings, disconnect, then reconnect to Google Calendar

### Issue: Events Created But Not Visible
- Check if events are in a different calendar (not "primary")
- Check if events are in the past (due to timezone issues)
- Check if events are filtered out in your calendar view

### Issue: "Not enough time available"
- This means no free slots were found during working hours (9am-6pm)
- Try setting a later due date
- Check if your calendar is very busy

## What to Share for Debugging

If events still don't appear, please share:
1. **Browser Console Output** - Copy any errors or logs
2. **Server Terminal Output** - Copy logs from when you click Schedule
3. **What you see**:
   - Do you see a success toast message?
   - What does the message say?
   - Any error toasts?

## Manual Verification

You can also manually check if events were created by:
1. Going to Google Calendar
2. Searching for "[Focus]" in the search bar
3. Checking if any events appear (they might be in the past or future)

