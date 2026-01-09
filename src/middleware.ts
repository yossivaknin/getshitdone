import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthCallback = pathname === '/auth/callback'
  const isAppPage = pathname === '/app'
  const authComplete = request.nextUrl.searchParams.get('auth_complete') === 'true'
  
  console.log('[Middleware] ========== MIDDLEWARE CALLED ==========');
  console.log('[Middleware] Pathname:', pathname);
  console.log('[Middleware] Is auth callback:', isAuthCallback);
  console.log('[Middleware] Is app page:', isAppPage);
  console.log('[Middleware] Auth complete flag:', authComplete);
  console.log('[Middleware] Full URL:', request.url);
  console.log('[Middleware] User-Agent:', request.headers.get('user-agent')?.substring(0, 100));
  
  try {
    // Skip middleware for static assets and API routes during SSR
    const { pathname } = request.nextUrl
    if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
      return NextResponse.next()
    }

    // Check if Supabase env vars are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // If no Supabase config, allow all routes (development mode)
      if (pathname === '/') {
        const loginRedirect = NextResponse.redirect(new URL('/login', request.url));
      loginRedirect.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      return loginRedirect
      }
      return NextResponse.next()
    }

    // Create Supabase client for server-side auth check
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
          },
        },
      }
    )

    // Get the current session (with timeout to prevent hanging)
    let session = null
    try {
      // If this is right after auth completion, wait a bit longer for cookies
      const isAuthComplete = request.nextUrl.searchParams.get('auth_complete') === 'true'
      const timeout = isAuthComplete ? 3000 : 2000
      
      console.log('[Middleware] Checking for session...');
      console.log('[Middleware] Request cookies:', request.cookies.getAll().map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0
      })));
      
      const { data } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), timeout)
        )
      ]) as any
      session = data?.session
      
      console.log('[Middleware] Session check result:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        expiresAt: session?.expires_at
      });
      
      if (isAuthComplete && !session) {
        console.log('[Middleware] ⚠️ Auth just completed but no session yet!');
        console.log('[Middleware] Request cookies:', request.cookies.getAll().map(c => c.name));
        console.log('[Middleware] This might cause redirect to login');
      }
    } catch (err) {
      // If session check fails, fail open (allow request)
      console.error('[Middleware] Session check failed:', err)
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/auth/callback']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    // Redirect root to login or app based on auth status
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = session ? '/app' : '/login'
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      return redirectResponse
    }

    // If accessing a protected route without session, redirect to login
    if (!isPublicRoute && !session) {
      console.log('[Middleware] ⚠️ No session found, redirecting to login');
      console.log('[Middleware] Pathname:', pathname);
      console.log('[Middleware] Is public route:', isPublicRoute);
      console.log('[Middleware] Auth complete flag:', authComplete);
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      if (pathname !== '/login') {
        url.searchParams.set('redirect', pathname)
      }
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      console.log('[Middleware] Redirecting to:', url.toString());
      return redirectResponse
    }

    // If accessing login page while already authenticated, redirect to app
    if (pathname === '/login' && session) {
      const appRedirect = NextResponse.redirect(new URL('/app', request.url));
      appRedirect.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      return appRedirect
    }

    // Allow the request to proceed
    console.log('[Middleware] ✅ Allowing request to proceed');
    console.log('[Middleware] Pathname:', pathname);
    console.log('[Middleware] Has session:', !!session);
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
    // Prevent caching of middleware responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return response
  } catch (error) {
    // Fail open - if middleware crashes, allow the request
    // This prevents blocking the app if there's any issue
    console.error('[Middleware] Error:', error)
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
    // Prevent caching even on errors
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)',
  ],
}
