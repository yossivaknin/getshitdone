import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/app'

  if (code) {
    // Create response object first to handle cookies
    const response = NextResponse.redirect(new URL(next, request.url))
    
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
                  sameSite: 'lax',
                  secure: process.env.NODE_ENV === 'production',
                  httpOnly: true,
                })
              } else {
                response.cookies.set(name, value, options)
              }
            })
          },
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(
        new URL('/login?message=' + encodeURIComponent('Authentication failed: ' + error.message), request.url)
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
                          (userAgent.includes('Safari') && !userAgent.includes('Chrome') && referer === '')

      if (isCapacitor) {
        // For Capacitor, redirect to app using custom URL scheme
        const appUrl = `com.sitrep.app://auth/callback?code=${code}&google_token=${encodeURIComponent(providerToken)}${providerRefreshToken ? `&google_refresh=${encodeURIComponent(providerRefreshToken)}` : ''}&from_supabase=true`
        
        console.log('[Auth Callback] Capacitor detected, redirecting to app')
        
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
                    try { window.location.href = appUrl; setTimeout(() => window.location.replace(appUrl), 100); } catch (e) { console.error(e); }
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
                <p>Please wait while we return you to the app.</p>
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
      const redirectUrl = new URL(next, request.url)
      redirectUrl.searchParams.set('google_token', providerToken)
      if (providerRefreshToken) {
        redirectUrl.searchParams.set('google_refresh', providerRefreshToken)
      }
      redirectUrl.searchParams.set('from_supabase', 'true')

      response.headers.set('location', redirectUrl.toString())
      response.status = 302
      return response
    }

    // Successful authentication - check if Capacitor
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    const isCapacitor = userAgent.includes('Capacitor') || 
                        requestUrl.searchParams.get('capacitor') === 'true' ||
                        (userAgent.includes('Safari') && !userAgent.includes('Chrome') && referer === '')

    if (isCapacitor) {
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
                window.location.href = appUrl;
                setTimeout(() => window.location.replace(appUrl), 100);
              })();
            </script>
          </head>
          <body>
            <div class="container">
              <div class="spinner"></div>
              <h2>Redirecting to SITREP...</h2>
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

  // If there's no code, redirect to login
  return NextResponse.redirect(
    new URL('/login?message=' + encodeURIComponent('Authentication failed: No authorization code'), request.url)
  )
}

