# iOS OAuth Client Setup - Complete

## Your iOS OAuth Client Information

From the plist file you received:

- **Client ID**: `342417702886-lr21gi6fetojm2e1lrp0vqad1vt9np6s.apps.googleusercontent.com`
- **Reversed Client ID**: `com.googleusercontent.apps.342417702886-lr21gi6fetojm2e1lrp0vqad1vt9np6s`
- **Bundle ID**: `com.yossivaknin.sitrep`

## Redirect URI Format

For iOS OAuth clients, Google uses the **reversed client ID** format:

```
com.googleusercontent.apps.342417702886-lr21gi6fetojm2e1lrp0vqad1vt9np6s:/oauth2redirect
```

## Update Your .env.local

Add the iOS client ID:

```bash
# iOS OAuth Client (for Capacitor)
NEXT_PUBLIC_GOOGLE_CLIENT_ID_IOS=342417702886-lr21gi6fetojm2e1lrp0vqad1vt9np6s.apps.googleusercontent.com

# Web OAuth Client (keep your existing one)
NEXT_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com

# Fallback
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## How It Works

The code automatically:
1. Detects if running in Capacitor
2. Uses `NEXT_PUBLIC_GOOGLE_CLIENT_ID_IOS` for Capacitor
3. Builds the redirect URI: `com.googleusercontent.apps.342417702886-lr21gi6fetojm2e1lrp0vqad1vt9np6s:/oauth2redirect`
4. After OAuth, redirects to the same URL scheme
5. App opens and receives tokens

## Next Steps

1. **Update .env.local** with the iOS client ID
2. **Restart dev server**: `npm run dev`
3. **Rebuild app in Xcode**: ⌘R
4. **Test OAuth** - should now work with the custom URL scheme!

## Note

The code now uses Google's standard reversed client ID format, which is the recommended approach for iOS OAuth clients. This format is automatically allowed by Google for iOS clients.


