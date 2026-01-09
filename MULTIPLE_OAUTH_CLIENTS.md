# Setting Up Multiple OAuth Clients (Web + iOS)

## Overview

You need **two separate OAuth client IDs**:
1. **Web Client ID** - For web browser (uses HTTPS redirect)
2. **iOS Client ID** - For Capacitor app (uses custom URL scheme)

## Step 1: Create Both OAuth Clients

### Web Client (for usesitrep.com)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Create Credentials → OAuth client ID
4. **Application type**: **Web application**
5. **Name**: `SITREP Web`
6. **Authorized redirect URIs**:
   - `https://usesitrep.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (for local dev)
7. Click **CREATE**
8. **Copy the Client ID**

### iOS Client (for Capacitor app)

1. Same location (APIs & Services → Credentials)
2. Create Credentials → OAuth client ID
3. **Application type**: **iOS**
4. **Name**: `SITREP iOS`
5. **Bundle ID**: `com.yossivaknin.sitrep`
6. Click **CREATE**
7. **Copy the Client ID**

## Step 2: Update Environment Variables

### Option A: Single .env.local (Recommended)

Add both client IDs to `.env.local`:

```bash
# Web OAuth Client (for browser)
NEXT_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com

# iOS OAuth Client (for Capacitor)
NEXT_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com

# Fallback (for backward compatibility)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

### Option B: Separate Files (Advanced)

- `.env.local` - Web client ID
- `.env.capacitor.local` - iOS client ID (would need custom loading)

**Recommendation**: Use Option A (single file with both IDs)

## Step 3: Update Code to Use Correct Client ID

The code will automatically detect if it's running in Capacitor and use the appropriate client ID.

## Current Implementation

The code already detects Capacitor and uses different redirect URIs. We just need to also use different client IDs.


