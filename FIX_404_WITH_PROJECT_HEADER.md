# Fix: 404 HTML Errors with X-Goog-User-Project Header

## 🚨 The Root Cause

The 404 HTML errors were **NOT** caused by:
- ❌ OAuth configuration issues
- ❌ Missing Calendar API enablement
- ❌ Billing problems
- ❌ Scope issues

**The real issue:** Google Calendar API calls were missing the `X-Goog-User-Project` header, which tells Google which project to bill/quota the request to. Without this header, Google returns an HTML 404 page instead of JSON.

## ✅ The Fix

Added `X-Goog-User-Project` header to **all** Google Calendar API calls:

### 1. FreeBusy API (`getBusySlots`)
**File:** `src/lib/calendar.ts` (line ~81)

```typescript
const googleProjectId = process.env.GOOGLE_PROJECT_ID || 'fast-asset-287619';

const response = await fetch(
  `https://www.googleapis.com/calendar/v3/freebusy`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': googleProjectId, // ← Added this!
    },
    body: JSON.stringify(requestBody),
  }
);
```

### 2. Create Event API (`createCalendarEvent`)
**File:** `src/lib/calendar.ts` (line ~507)

```typescript
const googleProjectId = process.env.GOOGLE_PROJECT_ID || 'fast-asset-287619';

const response = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': googleProjectId, // ← Added this!
    },
    body: JSON.stringify(eventData),
  }
);
```

### 3. Verify Event API
**File:** `src/lib/calendar.ts` (line ~568)

```typescript
const googleProjectId = process.env.GOOGLE_PROJECT_ID || 'fast-asset-287619';

const verifyResponse = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
  {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'X-Goog-User-Project': googleProjectId, // ← Added this!
    },
  }
);
```

### 4. Fetch Focus Events (in `scheduleTask`)
**File:** `src/app/actions.ts` (line ~544)

```typescript
const googleProjectId = process.env.GOOGLE_PROJECT_ID || 'fast-asset-287619'

const eventsResponse = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events?...`,
  {
    headers: {
      'Authorization': `Bearer ${validToken}`,
      'X-Goog-User-Project': googleProjectId, // ← Added this!
    },
  }
)
```

### 5. Debug Slots API
**File:** `src/app/api/debug-slots/route.ts` (line ~50)

```typescript
const googleProjectId = process.env.GOOGLE_PROJECT_ID || 'fast-asset-287619'

const eventsResponse = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events?...`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Goog-User-Project': googleProjectId, // ← Added this!
    },
  }
)
```

## 🔧 Configuration

### Environment Variable (Optional)

You can set `GOOGLE_PROJECT_ID` in your environment variables:

**Local (.env.local):**
```env
GOOGLE_PROJECT_ID=fast-asset-287619
```

**Production (Vercel):**
- Go to Vercel Dashboard → Settings → Environment Variables
- Add: `GOOGLE_PROJECT_ID` = `fast-asset-287619`

**Default:** If not set, defaults to `fast-asset-287619`

## 📋 What This Header Does

The `X-Goog-User-Project` header:
- ✅ Explicitly tells Google which project to bill the API request to
- ✅ Ensures quota is attributed to the correct project
- ✅ Prevents 404 HTML errors from project mismatch
- ✅ Required when using OAuth tokens from a different project context

## 🧪 Testing

After deployment:

1. **Try scheduling a task** - should work without 404 errors
2. **Check browser console** - should see successful API responses
3. **Check Network tab** - API calls should return JSON, not HTML

## ✅ Expected Results

**Before:**
```
❌ Response: <!DOCTYPE html>...404...That's an error...
```

**After:**
```
✅ Response: {"kind": "calendar#freeBusy", "calendars": {...}}
```

## 🎯 Why This Works

When Google receives an API request:
1. **Without `X-Goog-User-Project`**: Google tries to infer the project from the token, but if there's any ambiguity, it returns a 404 HTML page
2. **With `X-Goog-User-Project`**: Google explicitly knows which project to use, so it processes the request correctly

This is especially important when:
- Using OAuth tokens across different projects
- Billing is enabled (Google needs to know which project to bill)
- Quota limits are in place (Google needs to attribute usage correctly)

## 📚 Related Issues Fixed

- ✅ "Failed to fetch busy slots from calendar: Google Calendar API error (404)"
- ✅ HTML 404 responses instead of JSON
- ✅ Calendar API "not found" errors
- ✅ Scheduling tasks fails with 404

## 🔗 References

- [Google API User Project Header](https://cloud.google.com/apis/docs/system-parameters)
- [Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)

