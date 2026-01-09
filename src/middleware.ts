import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
      const { data } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        )
      ]) as any
      session = data?.session
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
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      if (pathname !== '/login') {
        url.searchParams.set('redirect', pathname)
      }
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      return redirectResponse
    }

    // If accessing login page while already authenticated, redirect to app
    if (pathname === '/login' && session) {
      const appRedirect = NextResponse.redirect(new URL('/app', request.url));
      appRedirect.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      return appRedirect
    }

    // Allow the request to proceed
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
