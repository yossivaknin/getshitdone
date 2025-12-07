import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', request.url));
  }

  try {
    // Exchange authorization code for tokens
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Use NEXT_PUBLIC_APP_URL if set, otherwise use request origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    console.log('[OAuth Callback] Redirect URI:', redirectUri);
    console.log('[OAuth Callback] Request origin:', request.nextUrl.origin);
    console.log('[OAuth Callback] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[OAuth Callback] Token exchange failed:', errorText);
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    
    console.log('[OAuth Callback] Token response:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      accessTokenLength: tokens.access_token?.length || 0,
      refreshTokenLength: tokens.refresh_token?.length || 0,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    });

    // Validate that we have an access token
    if (!tokens.access_token) {
      console.error('[OAuth Callback] ❌ No access_token in response!');
      console.error('[OAuth Callback] Response:', JSON.stringify(tokens, null, 2));
      return NextResponse.redirect(
        new URL('/settings?error=no_access_token', request.url)
      );
    }

    // Store tokens (in production, store in database)
    // For now, we'll pass them via URL params to the settings page
    // In production, use secure httpOnly cookies or database storage
    
    const redirectUrl = new URL('/settings', request.url);
    redirectUrl.searchParams.set('connected', 'true');
    redirectUrl.searchParams.set('token', tokens.access_token);
    if (tokens.refresh_token) {
      redirectUrl.searchParams.set('refresh', tokens.refresh_token);
    }
    
    console.log('[OAuth Callback] Redirecting to settings with tokens');
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=oauth_failed', request.url)
    );
  }
}

