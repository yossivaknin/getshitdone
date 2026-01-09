# Setting Up iOS OAuth Client ID

## The Problem

You're currently using a **Web application** OAuth client ID, which:
- Requires HTTPS redirect URIs
- Doesn't allow custom URL schemes like `com.sitrep.app://`
- Blocks sensitive scopes (Calendar) with custom schemes

## The Solution

Create an **iOS** OAuth client ID instead. This allows:
- Custom URL schemes (like `com.sitrep.app://`)
- No HTTPS requirement
- Works with sensitive scopes

## Step-by-Step Instructions

### Step 1: Create iOS OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
5. **IMPORTANT**: Under **"Application type"**, select **"iOS"** (NOT "Web application")
6. Fill in:
   - **Name**: `SITREP iOS App` (or any name)
   - **Bundle ID**: `com.yossivaknin.sitrep` (your actual bundle identifier from Xcode)
7. Click **"CREATE"**
8. **Copy the Client ID** (you'll need this)

### Step 2: Update Your Environment Variables

Update your `.env.local` file:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_NEW_IOS_CLIENT_ID.apps.googleusercontent.com
```

**Important**: Use the NEW iOS client ID, not the old web client ID.

### Step 3: Configure Redirect URI

For iOS native clients, Google allows your custom URL scheme. You can use:

**Option A: Your Custom Scheme (Recommended)**
```
com.sitrep.app:/oauth2redirect
```

**Option B: Google's Format**
```
com.googleusercontent.apps.YOUR_CLIENT_ID:/oauth2redirect
```

**Note**: Google doesn't require you to manually add this for iOS clients - it's implicit. But if you want to be explicit, you can add it.

### Step 4: Update Code

The code will automatically use the custom URL scheme. No changes needed if you use Option A.

## Current Configuration

- **Bundle ID**: `com.yossivaknin.sitrep`
- **URL Scheme**: `com.sitrep.app://oauth/callback`
- **OAuth Client Type**: Currently "Web" (needs to be "iOS")

## After Creating iOS Client

1. Update `.env.local` with the new iOS client ID
2. Restart dev server
3. Rebuild app in Xcode
4. Test OAuth - it should now work with the custom URL scheme!

## Why This Works

- **Web clients**: Require HTTPS, block custom schemes for sensitive scopes
- **iOS clients**: Allow custom schemes, no HTTPS requirement, work with sensitive scopes

This is the correct approach for native mobile apps.


