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
              response.cookies.set(name, value, options)
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
      
      // Pass tokens to client via URL params (will be saved to localStorage on client side)
      const redirectUrl = new URL(next, request.url)
      redirectUrl.searchParams.set('google_token', providerToken)
      if (providerRefreshToken) {
        redirectUrl.searchParams.set('google_refresh', providerRefreshToken)
      }
      redirectUrl.searchParams.set('from_supabase', 'true')
      
      return NextResponse.redirect(redirectUrl)
    }

    // Successful authentication - cookies are set in response
    return response
  }

  // If there's no code, redirect to login
  return NextResponse.redirect(
    new URL('/login?message=' + encodeURIComponent('Authentication failed: No authorization code'), request.url)
  )
}

