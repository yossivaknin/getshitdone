# Using Google Provider Token from Supabase OAuth

## ✅ What We've Implemented

When users log in with Google via Supabase OAuth (with calendar scope), we now:

1. **Extract the provider token** from Supabase session after OAuth callback
2. **Save it to localStorage** so it can be used for Calendar API calls
3. **Automatically connect Calendar** without needing a separate OAuth flow

## 🔍 How It Works

### Flow:
1. User clicks "Continue with Google" on login page
2. Supabase OAuth requests: `email profile https://www.googleapis.com/auth/calendar`
3. User grants permissions (including Calendar)
4. Supabase processes OAuth and creates session
5. **Auth callback** (`/auth/callback`) extracts `provider_token` from session
6. Token is passed to app via URL params
7. **App page** saves token to `localStorage` as `google_calendar_token`
8. Calendar API calls now work automatically!

## 📋 Code Changes

### 1. Auth Callback (`src/app/auth/callback/route.ts`)

Extracts provider token from Supabase session:

```typescript
const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

if (sessionData?.session?.provider_token) {
  const providerToken = sessionData.session.provider_token
  const providerRefreshToken = sessionData.session.provider_refresh_token
  
  // Pass to client via URL params
  redirectUrl.searchParams.set('google_token', providerToken)
  if (providerRefreshToken) {
    redirectUrl.searchParams.set('google_refresh', providerRefreshToken)
  }
}
```

### 2. App Page (`src/app/app/page.tsx`)

Saves token from URL params to localStorage:

```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const googleToken = urlParams.get('google_token');
  const fromSupabase = urlParams.get('from_supabase');

  if (fromSupabase === 'true' && googleToken) {
    localStorage.setItem('google_calendar_token', googleToken);
    // ... save refresh token if available
  }
}, []);
```

## ⚠️ Important Notes

### Supabase Provider Token Availability

Supabase may or may not expose `provider_token` in the session depending on:
- Supabase version
- OAuth provider configuration
- Session structure

**If `provider_token` is not available:**
- Users can still use the **separate Calendar OAuth flow** in Settings
- The scope fix ensures they'll get calendar permissions when they do connect

### Fallback Behavior

The code gracefully handles cases where:
- `provider_token` is not in session → No error, just continues normally
- Token format is invalid → Validates before saving
- User doesn't log in with Google → Uses separate Calendar OAuth flow

## 🧪 Testing

1. **Log out** of the app
2. **Log in with Google** (not email/password)
3. **Check browser console** for:
   ```
   [Auth Callback] Found provider token in Supabase session
   [App] ✅ Google Calendar access token saved from Supabase session
   ```
4. **Check localStorage**:
   ```javascript
   localStorage.getItem('google_calendar_token')
   ```
5. **Try scheduling a task** - it should work without needing to connect Calendar separately!

## 🔄 Two OAuth Flows (Both Work)

### Flow 1: Login OAuth (New - Automatic)
- User logs in with Google
- Calendar token automatically extracted and saved
- ✅ No extra steps needed

### Flow 2: Settings Calendar OAuth (Fallback)
- User goes to Settings → Connect Google Calendar
- Separate OAuth flow for Calendar only
- ✅ Still works if Flow 1 doesn't provide token

## 🐛 Troubleshooting

### "Provider token not found in session"

**Possible causes:**
- Supabase version doesn't expose provider_token
- OAuth provider not configured correctly in Supabase
- Session structure is different

**Solution:**
- Use the separate Calendar OAuth flow in Settings
- Check Supabase documentation for your version

### "Token doesn't have calendar scope"

**Solution:**
- Make sure login OAuth includes calendar scope (already fixed)
- User needs to re-authenticate to grant new permissions

### "Calendar API still returns 404"

**Check:**
- Is Calendar API enabled in Google Cloud Console?
- Is OAuth consent screen published?
- Are OAuth credentials in the same project as Calendar API?

