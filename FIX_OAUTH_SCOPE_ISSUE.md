# Fix: OAuth Scope Issue - Calendar Scope Not Requested

## 🚨 The Problem

When users log in with Google via Supabase, the OAuth flow only requests `email` and `profile` scopes, but **NOT** the `calendar` scope. This causes:

- ❌ "Token does not have calendar scope" errors
- ❌ 404 HTML errors when trying to access Calendar API
- ❌ Calendar connection fails even after login

## ✅ The Fix

The application code has been updated to request the calendar scope during login OAuth.

### What Changed

**File:** `src/app/login/actions.ts`

**Before:**
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUrl,
  },
})
```

**After:**
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUrl,
    scopes: 'email profile https://www.googleapis.com/auth/calendar',
  },
})
```

## 📋 What This Means

1. **Google Cloud Console** ✅ - Already correctly configured (you fixed this)
2. **Application Code** ✅ - Now updated to request calendar scope
3. **User Flow** ⚠️ - Users will need to **re-authenticate** to grant calendar permissions

## 🔄 Next Steps for Users

After this fix is deployed:

1. **Existing users** need to:
   - Log out
   - Log back in with Google
   - **Grant calendar permissions** when prompted
   - Then connect Google Calendar in Settings

2. **New users** will:
   - See calendar permission request during initial login
   - Be able to connect Calendar immediately after login

## 🧪 Testing

1. **Log out** of the app
2. **Log back in** with Google
3. **Check the OAuth consent screen** - it should now show:
   - ✅ See your email address
   - ✅ See your basic profile info
   - ✅ **See, edit, share, and permanently delete all the calendars you can access using Google Calendar** ← This is new!
4. **After login**, go to Settings → Connect Google Calendar
5. **It should work** without needing a separate OAuth flow

## 🔍 Verify It's Working

After re-authenticating, check the token:

1. Open browser console
2. Run: `localStorage.getItem('google_calendar_token')`
3. If you have a token, check its scope:
   ```javascript
   const token = localStorage.getItem('google_calendar_token');
   fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
     .then(r => r.json())
     .then(data => console.log('Token scope:', data.scope));
   ```
4. You should see: `https://www.googleapis.com/auth/calendar` in the scope

## ⚠️ Important Notes

### Supabase Configuration

Make sure in **Supabase Dashboard** → **Authentication** → **Providers** → **Google**:

- ✅ Google provider is **enabled**
- ✅ Client ID and Secret are set
- ✅ The scopes field (if present) includes calendar scope

### Google Cloud Console

The OAuth consent screen in Google Cloud Console should:

- ✅ Show the Calendar scope as requested
- ✅ Be in "Testing" or "Production" mode (not "Draft")
- ✅ Have the Calendar API enabled

### Two OAuth Flows

**Note:** There are still TWO separate OAuth flows:

1. **Login OAuth** (via Supabase) - Now requests calendar scope ✅
2. **Calendar Connection OAuth** (direct Google) - Still used for re-connection/refresh

Both should work, but the login OAuth now includes calendar permissions, so users might not need the separate calendar connection flow if they log in with Google.

## 🐛 Troubleshooting

### "Scope not granted" error

- **Solution:** User needs to log out and log back in to grant new permissions

### "Calendar API still returns 404"

- **Check:** Is Calendar API enabled in Google Cloud Console?
- **Check:** Is the OAuth consent screen published (not in Draft)?
- **Check:** Are you using the same Google Cloud project for OAuth and Calendar API?

### "Supabase OAuth doesn't support custom scopes"

- **Solution:** This is a known limitation. If Supabase doesn't support custom scopes, you'll need to keep the separate Calendar OAuth flow in Settings. The fix above should work with Supabase v2+.

## 📚 Related Files

- `src/app/login/actions.ts` - Login OAuth with calendar scope
- `src/app/settings/page.tsx` - Calendar connection OAuth (separate flow)
- `src/app/api/auth/google/callback/route.ts` - Calendar OAuth callback



