# Environment Variables Setup for Web + iOS

## Overview

You need **two OAuth client IDs**:
1. **Web Client** - For browser (usesitrep.com)
2. **iOS Client** - For Capacitor app

## Single .env.local File (Recommended)

You can use **one `.env.local` file** with both client IDs. The code automatically detects if it's running in Capacitor and uses the correct one.

### Your .env.local should have:

```bash
# Web OAuth Client (for browser)
NEXT_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com

# iOS OAuth Client (for Capacitor)
NEXT_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com

# Fallback (optional, for backward compatibility)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# Client Secret (shared between both, or separate if you prefer)
GOOGLE_CLIENT_SECRET=your-client-secret

# Other variables...
NEXT_PUBLIC_APP_URL=https://usesitrep.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GOOGLE_GEMINI_API_KEY=...
```

## How It Works

The code automatically:
- **Detects Capacitor**: Checks if `window.Capacitor` exists
- **Uses iOS Client ID**: When in Capacitor app
- **Uses Web Client ID**: When in browser

## Creating the OAuth Clients

### Web Client (for usesitrep.com)

1. Google Cloud Console → APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. **Application type**: **Web application**
4. **Name**: `SITREP Web`
5. **Authorized redirect URIs**:
   - `https://usesitrep.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback`
6. Click **CREATE**
7. Copy the **Client ID**

### iOS Client (for Capacitor)

1. Same location
2. Create Credentials → OAuth client ID
3. **Application type**: **iOS**
4. **Name**: `SITREP iOS`
5. **Bundle ID**: `com.yossivaknin.sitrep`
6. Click **CREATE**
7. Copy the **Client ID**

**Note**: For iOS clients, you don't need to manually add redirect URIs. Google automatically allows:
- `com.sitrep.app:/oauth2redirect` (your custom scheme)
- `com.googleusercontent.apps.CLIENT_ID:/oauth2redirect` (Google's format)

## Vercel Environment Variables

For production, add both to Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID_WEB` = your web client ID
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID_IOS` = your iOS client ID
   - `GOOGLE_CLIENT_SECRET` = your client secret
3. Enable for **Production**, **Preview**, and **Development**
4. Redeploy

## Testing

### Web (Browser)
- Uses: `NEXT_PUBLIC_GOOGLE_CLIENT_ID_WEB`
- Redirect: `https://usesitrep.com/api/auth/google/callback`

### iOS (Capacitor)
- Uses: `NEXT_PUBLIC_GOOGLE_CLIENT_ID_IOS`
- Redirect: `com.sitrep.app:/oauth2redirect`

The code automatically selects the correct one based on the environment.


