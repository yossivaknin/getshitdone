# Where Google Calendar Tokens Are Stored

## 📍 Current Storage Location

**Tokens are stored in browser `localStorage`** with these keys:
- `google_calendar_token` - Access token (expires in ~1 hour)
- `google_calendar_refresh_token` - Refresh token (long-lived, used to get new access tokens)

## 🔍 How to Check Your Tokens

### In Browser Console (F12):
```javascript
// Check access token
localStorage.getItem('google_calendar_token')

// Check refresh token
localStorage.getItem('google_calendar_refresh_token')

// See all localStorage items
Object.keys(localStorage)
```

### In Browser DevTools:
1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Click on your domain (`https://usesitrep.com`)
5. Look for:
   - `google_calendar_token`
   - `google_calendar_refresh_token`

## ⚠️ Why Tokens Can Disappear

**localStorage is client-side only** and can be cleared by:

1. **Browser cache clearing**
   - User clears browsing data
   - Browser settings clear localStorage
   - "Clear cache" actions

2. **Switching browsers/devices**
   - Tokens are per-browser, per-device
   - Mobile vs desktop = different tokens
   - Chrome vs Firefox = different tokens

3. **Incognito/Private mode**
   - localStorage is cleared when session ends

4. **Domain changes**
   - If you switch from `localhost` to `usesitrep.com`, tokens don't transfer

5. **Browser updates/settings**
   - Some browsers clear localStorage on updates
   - Privacy settings can block localStorage

## 🔄 Current Flow

1. **OAuth Callback** (`/api/auth/google/callback`):
   - Receives tokens from Google
   - Passes them to Settings page via URL params
   - Settings page saves to `localStorage`

2. **Token Usage**:
   - App reads from `localStorage` when scheduling
   - If expired, tries to refresh using `refresh_token`

3. **Token Refresh**:
   - Happens automatically when token expires
   - New token saved back to `localStorage`

## 💾 Better Solution: Store in Database

**Current Problem**: Tokens are lost if localStorage is cleared.

**Better Approach**: Store tokens in your Supabase database:

1. **Create a `user_tokens` table**:
   ```sql
   CREATE TABLE user_tokens (
     id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id uuid REFERENCES auth.users(id) NOT NULL,
     google_access_token text,
     google_refresh_token text,
     updated_at timestamptz DEFAULT now(),
     UNIQUE(user_id)
   );
   ```

2. **Store tokens server-side** after OAuth callback
3. **Retrieve tokens server-side** when needed
4. **Tokens persist** across browsers/devices

## Server endpoints

- POST `/api/save-google-tokens` — Upserts `google_token` and `google_refresh` into `user_tokens` for the authenticated user (used by the web client after OAuth login).
- POST `/api/refresh-token` — Exchanges a refresh token for a new access token using the server-side `GOOGLE_CLIENT_SECRET` (called by client-side refresh logic).
- POST `/api/calendar/schedule` — Server-side scheduling helper: accepts `taskData` and (optionally) working hours/timezone and uses stored tokens from `user_tokens` to schedule events so mobile clients don't need to hold tokens locally.

Note: After applying the `create-user-tokens-table.sql` migration, add `SUPABASE_SERVICE_ROLE_KEY` (optional but recommended) and `GOOGLE_CLIENT_SECRET` to your environment so token persistence and server-side refresh work securely.

## 🔧 Quick Fix: Reconnect

If your token disappeared:

1. Go to **Settings**
2. Click **"Connect Google Calendar"**
3. Complete OAuth flow
4. Token will be saved to `localStorage` again

## 🧪 Debug: Check if Token Exists

Run this in browser console:
```javascript
const token = localStorage.getItem('google_calendar_token');
const refresh = localStorage.getItem('google_calendar_refresh_token');

console.log('Access Token:', token ? `Found (${token.length} chars)` : '❌ Missing');
console.log('Refresh Token:', refresh ? `Found (${refresh.length} chars)` : '❌ Missing');
console.log('All localStorage keys:', Object.keys(localStorage));
```

## 📋 Summary

- **Where**: Browser `localStorage` (client-side)
- **Keys**: `google_calendar_token`, `google_calendar_refresh_token`
- **Why it disappears**: Browser cache clearing, switching browsers, etc.
- **Solution**: Reconnect in Settings, or store in database for persistence



