import { NextRequest, NextResponse } from 'next/server';

/**
 * Diagnostic endpoint to test OAuth configuration
 * This helps identify if the issue is with:
 * 1. Environment variables
 * 2. OAuth credentials
 * 3. Redirect URI configuration
 */
export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    issues: [],
    warnings: [],
    success: [],
  };

  // Check environment variables
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check Google OAuth credentials (for Calendar)
  if (!clientId) {
    diagnostics.issues.push({
      type: 'missing_env',
      message: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set',
      impact: 'Calendar OAuth will not work',
    });
  } else {
    diagnostics.success.push({
      type: 'env_found',
      message: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is set',
      preview: `${clientId.substring(0, 20)}...`,
    });
  }

  if (!clientSecret) {
    diagnostics.issues.push({
      type: 'missing_env',
      message: 'GOOGLE_CLIENT_SECRET is not set',
      impact: 'Calendar OAuth token exchange will fail',
    });
  } else {
    diagnostics.success.push({
      type: 'env_found',
      message: 'GOOGLE_CLIENT_SECRET is set',
      preview: `${clientSecret.substring(0, 10)}...`,
    });
  }

  // Check Supabase credentials (for login)
  if (!supabaseUrl) {
    diagnostics.issues.push({
      type: 'missing_env',
      message: 'NEXT_PUBLIC_SUPABASE_URL is not set',
      impact: 'Supabase login OAuth will not work',
    });
  } else {
    diagnostics.success.push({
      type: 'env_found',
      message: 'NEXT_PUBLIC_SUPABASE_URL is set',
    });
  }

  if (!supabaseKey) {
    diagnostics.issues.push({
      type: 'missing_env',
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set',
      impact: 'Supabase login OAuth will not work',
    });
  } else {
    diagnostics.success.push({
      type: 'env_found',
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is set',
    });
  }

  // Calculate redirect URIs
  const requestOrigin = request.nextUrl.origin;
  const baseUrl = appUrl || requestOrigin;
  const calendarRedirectUri = `${baseUrl}/api/auth/google/callback`;
  const loginRedirectUri = `${baseUrl}/auth/callback`;

  diagnostics.redirectUris = {
    calendar: calendarRedirectUri,
    login: loginRedirectUri,
    baseUrl,
    requestOrigin,
    appUrlSet: !!appUrl,
  };

  // Validate redirect URI format
  if (calendarRedirectUri.includes('localhost') && process.env.NODE_ENV === 'production') {
    diagnostics.warnings.push({
      type: 'redirect_uri_mismatch',
      message: 'Calendar redirect URI uses localhost in production',
      redirectUri: calendarRedirectUri,
      suggestion: 'Set NEXT_PUBLIC_APP_URL to your production domain',
    });
  }

  // Test if we can construct a valid OAuth URL
  if (clientId) {
    const testAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(calendarRedirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
      `access_type=offline&` +
      `prompt=consent`;

    diagnostics.calendarOAuthUrl = {
      constructed: true,
      url: testAuthUrl.substring(0, 200) + '...',
      redirectUri: calendarRedirectUri,
    };
  }

  // Check if Client ID format is valid
  if (clientId && !clientId.includes('.apps.googleusercontent.com')) {
    diagnostics.warnings.push({
      type: 'invalid_client_id_format',
      message: 'Client ID does not look like a valid Google OAuth Client ID',
      expectedFormat: 'xxxxx.apps.googleusercontent.com',
      received: clientId.substring(0, 50),
    });
  }

  // Summary
  diagnostics.summary = {
    totalIssues: diagnostics.issues.length,
    totalWarnings: diagnostics.warnings.length,
    totalSuccess: diagnostics.success.length,
    status: diagnostics.issues.length > 0 ? 'FAILED' : diagnostics.warnings.length > 0 ? 'WARNING' : 'OK',
  };

  return NextResponse.json(diagnostics, {
    status: diagnostics.issues.length > 0 ? 500 : 200,
  });
}

