import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
try {
  console.log('[Auth Callback] ========== CALLBACK ROUTE CALLED ==========');
  console.log('[Auth Callback] Request URL:', request.url);
  console.log('[Auth Callback] Request origin:', new URL(request.url).origin);
  console.log('[Auth Callback] User-Agent:', request.headers.get('user-agent')?.substring(0, 100));
  console.log('[Auth Callback] Referer:', request.headers.get('referer'));
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/app'

  if (code) {
    // Create response object first to handle cookies
    // Use production URL for redirect to ensure it works in Capacitor WebView
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url.split('/auth/callback')[0]
    const response = NextResponse.redirect(new URL(next, baseUrl))
    
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
              request.cookies.set(name, value)
              // Extend session cookies to 1 year (until user signs out)
              // This applies to auth session cookies (sb-*-auth-token)
              if (name.includes('auth-token')) {
                response.cookies.set(name, value, {
                  ...options,
                  maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
                  sameSite: 'lax', // Use 'lax' for Capacitor compatibility
                  secure: process.env.NODE_ENV === 'production',
                  httpOnly: true,
                  path: '/', // Ensure cookies are available for all paths
                  // Don't set domain - let browser handle it (works better in Capacitor)
                })
              } else {
                response.cookies.set(name, value, options)
              }
            })
          },
        },
      }
    )

        console.log('[Auth Callback] Exchanging code for session...');
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('[Auth Callback] Session exchange result:', {
      hasError: !!error,
      errorMessage: error?.message,
      hasSession: !!sessionData?.session,
      hasUser: !!sessionData?.session?.user,
      userId: sessionData?.session?.user?.id,
      hasProviderToken: !!sessionData?.session?.provider_token
    });
    
    if (error) {
      console.error('[Auth Callback] ❌ OAuth callback error:', error)
      console.error('[Auth Callback] Error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
      })
      
      // Return error page instead of redirecting (helps with debugging)
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Authentication Error</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0F0F0F; color: #fff; }
              .container { text-align: center; padding: 2rem; max-width: 600px; }
              .error { color: #ef4444; margin: 1rem 0; }
              .code { background: #1A1A1A; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; font-family: monospace; font-size: 0.875rem; }
              a { color: #10b981; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Authentication Failed</h1>
              <div class="error">
                <p><strong>Error:</strong> ${error.message || 'Unknown error'}</p>
                <p><strong>Status:</strong> ${error.status || 'N/A'}</p>
              </div>
              <div class="code">
                <p>This usually means:</p>
                <ul style="text-align: left; margin: 1rem 0;">
                  <li>The authorization code has expired</li>
                  <li>The code has already been used</li>
                  <li>Supabase redirect URLs are misconfigured</li>
                  <li>There's a network issue</li>
                </ul>
              </div>
              <p><a href="/login">Return to Login</a></p>
            </div>
          </body>
        </html>`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }

    // Extract Google provider token from session if available
    // Supabase stores provider tokens in session.provider_token
    if (sessionData?.session?.provider_token) {
      console.log('[Auth Callback] Found provider token in Supabase session')
      const providerToken = sessionData.session.provider_token
      const providerRefreshToken = sessionData.session.provider_refresh_token

      // Attempt to persist tokens server-side using service role (optional)
      // This will allow mobile + web to share the same stored refresh token
      try {
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          // Dynamically import supabase-js to avoid bundling on client
          const { createClient: createAdminClient } = await import('@supabase/supabase-js')
          const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)

          const upsertData: any = {
            user_id: sessionData.session.user?.id,
            google_access_token: providerToken,
            google_refresh_token: providerRefreshToken || null,
            updated_at: new Date().toISOString()
          }

          // token_expires_at may be present in sessionData.session.expires_at (seconds since epoch)
          if ((sessionData.session as any).expires_at) {
            const expiresAtSec = (sessionData.session as any).expires_at
            try {
              upsertData.token_expires_at = new Date(expiresAtSec * 1000).toISOString()
            } catch { /* ignore */ }
          }

          try {
            await admin.from('user_tokens').upsert(upsertData, { onConflict: 'user_id' })
            console.log('[Auth Callback] ✅ Tokens saved server-side using service role')
          } catch (err) {
            console.warn('[Auth Callback] Could not save tokens server-side:', err)
          }
        }
      } catch (err) {
        console.warn('[Auth Callback] Error while attempting server-side token save:', err)
      }

      // Detect if this is from Capacitor (mobile app)
      const userAgent = request.headers.get('user-agent') || ''
      const referer = request.headers.get('referer') || ''
      const isCapacitor = userAgent.includes('Capacitor') || 
                          requestUrl.searchParams.get('capacitor') === 'true' ||
                          // Detect iOS Safari (common when OAuth opens in Safari from app)
                          (userAgent.includes('Safari') && !userAgent.includes('Chrome') && (referer === '' || userAgent.includes('iPhone') || userAgent.includes('iPad'))) ||
                          // Also check if request came from our app domain (Supabase redirects here)
                          (referer && referer.includes('usesitrep.com') && userAgent.includes('iPhone'))

      // Check if request is from WebView (already in app) vs Safari (external)
      const requestOrigin = requestUrl.origin
      const isFromWebView = requestOrigin.includes('usesitrep.com') || requestOrigin.includes('localhost')
      
      if (isCapacitor && !isFromWebView) {
        // Request is from Safari (external) - redirect to app using custom URL scheme
        const appUrl = `com.sitrep.app://auth/callback?code=${code}&google_token=${encodeURIComponent(providerToken)}${providerRefreshToken ? `&google_refresh=${encodeURIComponent(providerRefreshToken)}` : ''}&from_supabase=true`
        
        console.log('[Auth Callback] Capacitor detected, redirecting to app');
        console.log('[Auth Callback] User-Agent:', userAgent);
        console.log('[Auth Callback] Referer:', referer);
        console.log('[Auth Callback] App URL:', appUrl);
        console.log('[Auth Callback] Code:', code ? code.substring(0, 20) + '...' : 'none');
        console.log('[Auth Callback] Provider Token:', providerToken ? providerToken.substring(0, 20) + '...' : 'none');
        
        // Return HTML page that redirects to the app
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Redirecting to SITREP...</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0F0F0F; color: #fff; }
                .container { text-align: center; padding: 2rem; }
                .spinner { border: 3px solid #1A1A1A; border-top: 3px solid #10b981; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              </style>
              <script>
                (function() {
                  const appUrl = '${appUrl.replace(/'/g, "\'")}';
                  function openApp() {
                    try { // Redirect to app's WebView URL (cookies will be available)
window.location.href = appUrl;
// Fallback: try to open app if WebView redirect doesn't work
setTimeout(() => {
  try {
    window.location.replace(appUrl);
  } catch (e) {
    console.error('Redirect error:', e);
  }
}, 100); setTimeout(() => window.location.replace(appUrl), 100); } catch (e) { console.error(e); }
                  }
                  openApp();
                  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', openApp); } else { openApp(); }
                  window.addEventListener('load', () => setTimeout(openApp, 50));
                })();
              </script>
            </head>
            <body>
              <div class="container">
                <div class="spinner"></div>
                <h2>Redirecting to SITREP...</h2>
                <a href="${appUrl.replace(/'/g, "\'")}" id="open-app-btn" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #10b981; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 500;">Open SITREP App</a>
                <p>Please wait while we return you to the app.</p>
                <a href="${appUrl.replace(/'/g, "\'")}" id="open-app-btn" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #10b981; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 500;">Open SITREP App</a>
              </div>
            </body>
          </html>`,
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              ...Object.fromEntries(response.headers.entries()),
            },
          }
        )
      }

      // For web, pass tokens to client via URL params
      // Use production URL for redirect to ensure it works in Capacitor WebView
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url.split('/auth/callback')[0]
      const redirectUrl = new URL(next, baseUrl)
      redirectUrl.searchParams.set('google_token', providerToken)
      if (providerRefreshToken) {
        redirectUrl.searchParams.set('google_refresh', providerRefreshToken)
      }
      redirectUrl.searchParams.set('from_supabase', 'true')
      redirectUrl.searchParams.set('auth_complete', 'true') // Flag for middleware

      console.log('[Auth Callback] ========== REDIRECTING TO /app ==========');
      console.log('[Auth Callback] Redirect URL:', redirectUrl.toString());
      console.log('[Auth Callback] Response cookies count:', response.cookies.getAll().length);
      console.log('[Auth Callback] Response cookies:', response.cookies.getAll().map(c => ({
        name: c.name,
        value: c.value ? c.value.substring(0, 20) + '...' : 'empty',
        path: c.path,
        domain: c.domain,
        sameSite: c.sameSite,
        secure: c.secure
      })));
      console.log('[Auth Callback] Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('[Auth Callback] Response status:', response.status)
      
      // Ensure cookies are included in redirect response
      response.headers.set('location', redirectUrl.toString())
      response.status = 302
      return response
    }

    // Successful authentication - check if Capacitor
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
      const isCapacitor = userAgent.includes('Capacitor') || 
                          requestUrl.searchParams.get('capacitor') === 'true' ||
                          // Detect iOS Safari (common when OAuth opens in Safari from app)
                          (userAgent.includes('Safari') && !userAgent.includes('Chrome') && (referer === '' || userAgent.includes('iPhone') || userAgent.includes('iPad'))) ||
                          // Also check if request came from our app domain (Supabase redirects here)
                          (referer && referer.includes('usesitrep.com') && userAgent.includes('iPhone'))

    // Check if request is from WebView (already in app) vs Safari (external)
    const requestOrigin = requestUrl.origin
    const isFromWebView = requestOrigin.includes('usesitrep.com') || requestOrigin.includes('localhost')
    
    if (isCapacitor && !isFromWebView) {
      // Request is from Safari (external) - redirect to app using custom URL scheme
      const appUrl = `com.sitrep.app://auth/callback?code=${code}`
      console.log('[Auth Callback] Capacitor detected (no provider token), redirecting to app')
      
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redirecting to SITREP...</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0F0F0F; color: #fff; }
              .container { text-align: center; padding: 2rem; }
              .spinner { border: 3px solid #1A1A1A; border-top: 3px solid #10b981; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
            <script>
              (function() {
                const appUrl = '${appUrl.replace(/'/g, "\'")}';
                // Redirect to app's WebView URL (cookies will be available)
window.location.href = appUrl;
// Fallback: try to open app if WebView redirect doesn't work
setTimeout(() => {
  try {
    window.location.replace(appUrl);
  } catch (e) {
    console.error('Redirect error:', e);
  }
}, 100);
                setTimeout(() => window.location.replace(appUrl), 100);
              })();
            </script>
          </head>
          <body>
            <div class="container">
              <div class="spinner"></div>
              <h2>Redirecting to SITREP...</h2>
                <a href="${appUrl.replace(/'/g, "\'")}" id="open-app-btn" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #10b981; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 500;">Open SITREP App</a>
            </div>
          </body>
        </html>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            ...Object.fromEntries(response.headers.entries()),
          },
        }
      )
    }

    // Successful authentication - cookies are set in response
    return response
  }

  // If there's no code, return error page
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>No Authorization Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0F0F0F; color: #fff; text-align: center; padding: 2rem; }
          a { color: #10b981; }
        </style>
      </head>
      <body>
        <div>
          <h1>❌ No Authorization Code</h1>
          <p>The OAuth callback did not include an authorization code.</p>
          <p><a href="/login">Return to Login</a></p>
        </div>
      </body>
    </html>`,
    { status: 400, headers: { 'Content-Type': 'text/html' } }
  )
  } catch (error: any) {
    console.error('[Auth Callback] ❌❌❌ UNEXPECTED ERROR:', {
      error: error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name,
    });
    
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Server Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0F0F0F; color: #fff; padding: 2rem; }
            .container { max-width: 600px; text-align: center; }
            .error { background: #1A1A1A; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; text-align: left; }
            pre { font-family: monospace; font-size: 0.875rem; white-space: pre-wrap; word-break: break-all; }
            a { color: #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Server Error (500)</h1>
            <div class="error">
              <p><strong>Error:</strong> ${error?.message || 'Unknown error'}</p>
              <p><strong>Type:</strong> ${error?.name || 'Error'}</p>
              <details>
                <summary>Stack Trace</summary>
                <pre>${error?.stack || 'No stack trace'}</pre>
              </details>
            </div>
            <p><a href="/login">Return to Login</a></p>
          </div>
        </body>
      </html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

