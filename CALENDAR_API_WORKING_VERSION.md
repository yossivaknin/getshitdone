# ✅ Google Calendar API - Working Version

**Date:** December 14, 2025  
**Commit:** `e171937` (Remove API key from createCalendarEvent and verifyEvent)  
**Status:** ✅ **WORKING** - All Calendar API calls are functional

---

## 🎯 What's Working

All Google Calendar API endpoints are working correctly:

- ✅ **Token Validation** - OAuth token is valid with calendar scope
- ✅ **Calendar List API** - Can fetch user's calendars (status 200)
- ✅ **FreeBusy API** - Can fetch busy slots (status 200)
- ✅ **Create Event API** - Can create calendar events (status 200)
- ✅ **Verify Event API** - Can verify created events

---

## 🔧 Key Fixes Applied

### 1. Case-Sensitive Endpoint (Critical Fix)
**Problem:** Using `/freebusy` (lowercase) returned 404 HTML page  
**Solution:** Changed to `/freeBusy` (capital B) - Google's API is case-sensitive

```typescript
// ❌ Wrong
const apiUrl = `https://www.googleapis.com/calendar/v3/freebusy`;

// ✅ Correct
const apiUrl = `https://www.googleapis.com/calendar/v3/freeBusy`;
```

### 2. Removed X-Goog-User-Project Header
**Problem:** Header was using wrong project ID (`sitrep-prod-481010`) while token belongs to `342417702886`  
**Solution:** Removed header entirely - Google infers project from OAuth token automatically

```typescript
// ❌ Wrong - causes 404 when project mismatch
headers['X-Goog-User-Project'] = googleProjectId;

// ✅ Correct - let Google infer from token
// No header needed
```

### 3. Removed API Key from OAuth Requests
**Problem:** API key and OAuth token were from different projects, causing "different projects" error  
**Solution:** Removed API key from all Calendar API calls - OAuth token is sufficient

```typescript
// ❌ Wrong - causes "different projects" error
let apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
if (googleApiKey) {
  apiUrl += `?key=${encodeURIComponent(googleApiKey)}`;
}

// ✅ Correct - OAuth token only
const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
```

### 4. OAuth Scope Fix (Earlier Fix)
**Problem:** OAuth flow wasn't requesting calendar scope  
**Solution:** Added `https://www.googleapis.com/auth/calendar` scope to Supabase OAuth

```typescript
// In src/app/login/actions.ts
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUrl,
    scopes: 'email profile https://www.googleapis.com/auth/calendar',
  },
})
```

---

## 📋 Current Configuration

### OAuth Token Details
- **Project Number:** `342417702886`
- **Client ID:** `342417702886-8qd7vaufm85vi32qq64o163nqgd6r4a0.apps.googleusercontent.com`
- **Scope:** `https://www.googleapis.com/auth/calendar`

### API Endpoints Used
- **Token Info:** `https://www.googleapis.com/oauth2/v1/tokeninfo`
- **Calendar List:** `https://www.googleapis.com/calendar/v3/users/me/calendarList`
- **FreeBusy:** `https://www.googleapis.com/calendar/v3/freeBusy` (capital B!)
- **Create Event:** `https://www.googleapis.com/calendar/v3/calendars/primary/events`
- **Get Event:** `https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}`

### Headers Used
```typescript
{
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
}
```

**Note:** No `X-Goog-User-Project` header, no API key in URL.

---

## 🔄 How to Revert to This Version

If Calendar API stops working in the future, revert to this commit:

```bash
# 1. Check current commit
git log --oneline -5

# 2. Revert to working version
git checkout e171937

# 3. Or create a new branch from this commit
git checkout -b calendar-api-working e171937

# 4. If you want to force push (be careful!)
git push origin calendar-api-working --force
```

**Commit Hash:** `e171937`  
**Full commit message:** "Remove API key from createCalendarEvent and verifyEvent"

---

## 🚨 Common Issues & Solutions

### Issue: 404 HTML Page
**Cause:** Wrong endpoint case (`/freebusy` instead of `/freeBusy`)  
**Solution:** Use `/freeBusy` with capital B

### Issue: "Different projects" error
**Cause:** API key and OAuth token from different projects  
**Solution:** Remove API key from URL - OAuth token is sufficient

### Issue: "Token does not have calendar scope"
**Cause:** OAuth flow didn't request calendar scope  
**Solution:** Ensure `https://www.googleapis.com/auth/calendar` is in OAuth scopes

### Issue: 404 with X-Goog-User-Project header
**Cause:** Header specifies wrong project ID  
**Solution:** Remove header - Google infers project from token automatically

---

## 📝 Files Modified

Key files that were changed to make this work:

1. **`src/lib/calendar.ts`**
   - Fixed `/freebusy` → `/freeBusy` (case-sensitive)
   - Removed `X-Goog-User-Project` header
   - Removed API key from all endpoints

2. **`src/app/login/actions.ts`**
   - Added calendar scope to OAuth flow

3. **`src/app/api/test-calendar-api/route.ts`**
   - Fixed `/freebusy` → `/freeBusy`

---

## ✅ Verification Checklist

To verify Calendar API is working:

1. ✅ Token validation returns project `342417702886`
2. ✅ Calendar list API returns status 200
3. ✅ FreeBusy API returns status 200 with busy slots
4. ✅ Create event API returns status 200
5. ✅ No "different projects" errors
6. ✅ No 404 HTML page errors

---

## 🔗 Related Documentation

- Google Calendar API Docs: https://developers.google.com/calendar/api/v3/reference
- FreeBusy API: https://developers.google.com/calendar/api/v3/reference/freebusy/query
- OAuth 2.0: https://developers.google.com/identity/protocols/oauth2

---

**Last Verified:** December 14, 2025  
**Status:** ✅ Production Ready

