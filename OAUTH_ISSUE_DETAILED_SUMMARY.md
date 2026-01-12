# OAuth Authentication Issue - Detailed Summary

## Problem Statement

We have a Next.js app with Capacitor iOS integration that uses Supabase for authentication with Google OAuth. The OAuth flow works on web but fails on mobile (Capacitor iOS app) with a persistent white screen after authentication.

## Architecture Overview

- **Frontend**: Next.js 13+ with App Router
- **Mobile**: Capacitor iOS app
- **Authentication**: Supabase Auth with Google OAuth
- **Deployment**: Vercel (production: https://usesitrep.com)
- **OAuth Flow**: PKCE (Proof Key for Code Exchange)

## The Core Issue: PKCE "Split Brain" Problem

### What Should Happen

1. User clicks "Continue with Google" in the mobile app
2. App opens Safari for Google OAuth
3. User authenticates with Google
4. Google redirects to `com.sitrep.app://auth/callback?code=...`
5. App receives the deep link
6. **Code is exchanged for session on the CLIENT** (where PKCE verifier is stored)
7. User is redirected to `/app`

### What's Actually Happening

1. ✅ User clicks "Continue with Google"
2. ✅ Safari opens for OAuth
3. ✅ User authenticates
4. ✅ Deep link is received: `com.sitrep.app://auth/callback?code=...`
5. ❌ **Code is sent to server for exchange** (server doesn't have PKCE verifier)
6. ❌ Server returns 500 error
7. ❌ White screen appears

## Current Implementation

### 1. Login Action (`src/app/login/actions.ts`)

```typescript
export async function loginWithGoogle() {
  const supabase = createClient()
  
  // Detect Capacitor
  const userAgent = headersList.get('user-agent') || ''
  const isCapacitor = userAgent.includes('Capacitor')
  
  let redirectUrl: string
  if (isCapacitor) {
    // Use custom URL scheme for mobile
    redirectUrl = 'com.sitrep.app://auth/callback'
  } else {
    // Use web URL for browser
    redirectUrl = `${origin}/auth/callback`
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      scopes: 'email profile https://www.googleapis.com/auth/calendar',
    },
  })
  
  if (error) throw error
  if (data?.url) redirect(data.url)
}
```

### 2. Deep Link Handler (`src/components/capacitor-init.tsx`)

**Current Implementation (Should Work):**

```typescript
App.addListener('appUrlOpen', (data: { url: string }) => {
  logToXcode('log', '[Capacitor] ========== APP URL OPEN LISTENER TRIGGERED ==========');
  logToXcode('log', '[Capacitor] Received URL:', data.url);
  
  if (data.url.startsWith('com.sitrep.app://auth/callback')) {
    const url = new URL(data.url)
    const code = url.searchParams.get('code')
    
    if (code) {
      // ✅ CORRECT: Exchange code on CLIENT where PKCE verifier is stored
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        logToXcode('error', '[Capacitor] ❌ Session exchange failed:', error)
        window.location.href = '/login?error=session_exchange_failed'
        return
      }
      
      if (!data?.session) {
        logToXcode('error', '[Capacitor] ❌ No session in exchange response')
        window.location.href = '/login?error=no_session'
        return
      }
      
      logToXcode('log', '[Capacitor] ✅ Session created successfully!')
      window.location.href = '/app?auth_complete=true'
    }
  }
})
```

### 3. Server-Side Callback Route (`src/app/auth/callback/route.ts`)

**This route is for WEB only, not mobile:**

```typescript
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    
    if (code) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url.split('/auth/callback')[0]
      const response = NextResponse.redirect(new URL('/app', baseUrl))
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                if (name.includes('auth-token')) {
                  response.cookies.set(name, value, {
                    ...options,
                    maxAge: 60 * 60 * 24 * 365,
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'production',
                    httpOnly: true,
                    path: '/',
                  })
                } else {
                  response.cookies.set(name, value, options)
                }
              })
            },
          },
        },
      )
      
      const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        return new NextResponse(/* error HTML */, { status: 500 })
      }
      
      // Create redirect response with cookies
      const redirectResponse = NextResponse.redirect(new URL('/app', baseUrl))
      // Copy cookies...
      return redirectResponse
    }
  } catch (error: any) {
    // Error handling...
  }
}
```

## Errors Encountered

### Error 1: 500 Internal Server Error (Server-Side)

**When**: Mobile app tries to fetch `/auth/callback` route

**Error Message**: 
```
Cannot set property status of #<_Response> which has only a getter
TypeError
```

**Root Cause**: 
- Server route tried to set `response.status = 302` (read-only property)
- **Fixed**: Removed status assignment, create new redirect response

### Error 2: PKCE Verifier Missing (Server-Side)

**When**: Server tries to exchange code for session

**Error Message**: 
```
Dynamic server usage: Page couldn't be rendered statically because it used `request.url`
```

**Root Cause**: 
- Server doesn't have PKCE code verifier (stored in client's localStorage)
- **Solution**: Exchange code on client, not server

### Error 3: White Screen After OAuth

**When**: After Google OAuth completes and redirects back to app

**Symptoms**:
- Deep link is received: `com.sitrep.app://auth/callback?code=...`
- App tries to process it
- White screen appears
- App freezes

**Root Cause**: 
- Code exchange fails (500 error from server) OR
- Listener not being triggered OR
- Navigation failing

## Configuration Files

### 1. iOS Info.plist (`ios/App/App/Info.plist`)

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.sitrep.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.sitrep.app</string>
      <string>com.googleusercontent.apps.342417702886-lr21gi6fetojm2e1lrp0vqad1vt9np6s</string>
    </array>
  </dict>
</array>
```

**Status**: ✅ Correctly configured

### 2. Capacitor Config (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

function getServerUrl() {
  if (process.env.NODE_ENV === 'production') {
    return 'https://usesitrep.com'
  }
  const localIPs = ['192.168.1.70', '192.168.1.34']
  return 'https://usesitrep.com'
}

const config: CapacitorConfig = {
  appId: 'com.sitrep.app',
  appName: 'SITREP',
  webDir: '.next',
  server: {
    url: getServerUrl(),
    cleartext: true,
  },
}

export default config
```

**Status**: ✅ Correctly configured

### 3. Supabase Redirect URLs

**Required URLs in Supabase Dashboard → Authentication → URL Configuration:**

```
https://usesitrep.com/auth/callback
http://localhost:3000/auth/callback
com.sitrep.app://auth/callback
```

**Status**: ✅ Should be configured (verify in Supabase dashboard)

## Expected Behavior

### Mobile OAuth Flow (Should Work)

1. User clicks "Continue with Google"
2. Safari opens with Google OAuth
3. User authenticates
4. Google redirects to `com.sitrep.app://auth/callback?code=abc123...`
5. **iOS receives deep link** → `[AppDelegate] Received deep link: com.sitrep.app://auth/callback?code=...`
6. **Capacitor receives deep link** → `[Capacitor] ========== APP URL OPEN LISTENER TRIGGERED ==========`
7. **Code extracted** → `[Capacitor] Code received: abc123...`
8. **Client-side exchange** → `[Capacitor] ✅ Exchanging code on client (PKCE verifier is here)`
9. **Session created** → `[Capacitor] ✅ Session created successfully!`
10. **Navigate to app** → `[Capacitor] Navigating to /app...`
11. **App loads** → User sees the main app interface

### Current Actual Behavior

1. ✅ User clicks "Continue with Google"
2. ✅ Safari opens
3. ✅ User authenticates
4. ✅ Deep link is received (confirmed in Xcode logs)
5. ❌ **No logs from Capacitor listener** (or logs show but exchange fails)
6. ❌ White screen appears
7. ❌ App freezes

## Debugging Information

### Xcode Logs (What We See)

```
[AppDelegate] Received deep link: com.sitrep.app://auth/callback?code=...
⚡️ TO JS {"url":"com.sitrep.app:\/\/auth\/callback?code=...","iosSourceApplication":"","iosOpenInPlace":""}
[AppDelegate] ApplicationDelegateProxy result: true
```

**But then:**
- No `[Capacitor] ========== APP URL OPEN LISTENER TRIGGERED ==========` log
- Or logs show but exchange fails
- White screen appears

## Questions to Investigate

1. **Is the listener being registered?**
   - Check if `App.addListener('appUrlOpen', ...)` is being called
   - Check if there are any errors during listener registration

2. **Is the deep link being received by Capacitor?**
   - Xcode logs show iOS receives it
   - But does Capacitor bridge receive it?

3. **Is the code exchange working?**
   - Check if `supabase.auth.exchangeCodeForSession(code)` succeeds
   - Check if session is created

4. **Is navigation working?**
   - Check if `window.location.href = '/app'` is being called
   - Check if middleware is blocking navigation

5. **Is session persisting?**
   - Check if session cookies are being set
   - Check if middleware recognizes the session

## Recommended Next Steps

1. **Add more logging** to trace the entire flow
2. **Test listener registration** - verify it's added before deep link
3. **Test code exchange** - verify Supabase client works
4. **Test session persistence** - verify session is stored
5. **Test navigation** - verify `/app` route is accessible

## Environment Variables

**Required in Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_APP_URL=https://usesitrep.com
```

## Summary

The core issue is that we've fixed the PKCE "split brain" problem by moving code exchange to the client, but the app is still showing a white screen after OAuth. The deep link is being received (confirmed in Xcode logs), but either:

1. The Capacitor listener isn't being triggered
2. The code exchange is failing silently
3. The navigation is failing
4. The session isn't persisting

We need to add comprehensive logging and trace the entire flow to identify where it's failing.
