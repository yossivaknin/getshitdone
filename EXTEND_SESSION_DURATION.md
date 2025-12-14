# Extended Session Duration Configuration

## ✅ What Was Changed

The session duration has been extended to **1 year** (365 days). Users will remain logged in until they explicitly sign out.

## 🔧 Code Changes

Updated cookie settings in:
- `src/middleware.ts` - Middleware cookie handling
- `src/utils/supabase/server.ts` - Server-side Supabase client
- `src/app/auth/callback/route.ts` - OAuth callback handler

All auth session cookies (`sb-*-auth-token`) now have:
- `maxAge: 60 * 60 * 24 * 365` (1 year in seconds)
- `sameSite: 'lax'` (for security)
- `secure: true` in production (HTTPS only)
- `httpOnly: true` (prevents JavaScript access)

## ⚙️ Supabase Dashboard Settings (Optional)

For maximum session duration, you can also configure JWT expiry in Supabase:

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Authentication** → **Settings** → **Auth**
4. Under **JWT Settings**, you can adjust:
   - **JWT expiry**: Set to a longer duration (e.g., 1 year)
   - **Refresh token expiry**: Set to match or exceed JWT expiry

**Note:** The cookie maxAge we set in code will keep the session alive, but the JWT itself also has an expiry. Setting both ensures maximum compatibility.

## 🔒 Security Notes

- Sessions persist for 1 year, but users can still sign out manually
- Cookies are `httpOnly` (not accessible via JavaScript)
- Cookies are `secure` in production (HTTPS only)
- `sameSite: 'lax'` prevents CSRF attacks while allowing normal navigation

## 📝 Testing

After deployment:
1. Log in to your app
2. Close the browser
3. Reopen the browser and navigate to the app
4. You should still be logged in (no need to log in again)

The session will persist until:
- User explicitly signs out
- User clears browser cookies
- 1 year passes (then they'll need to log in again)

