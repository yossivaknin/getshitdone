'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Build timestamp to verify latest version - UPDATE THIS WHEN YOU DEPLOY
  const BUILD_TIMESTAMP = '2026-01-24-19:00:00-CALLBACK-V3';
  
  useEffect(() => {
    console.log('🔵🔵🔵 [AUTH CALLBACK] CALLBACK PAGE LOADED - Build:', BUILD_TIMESTAMP);
    console.log('🔵🔵🔵 If you see this, you are on the CALLBACK page with the latest code!');
    
    const handleCallback = async () => {
      try {
        const supabase = createClient();
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        
        console.log('[OAuth Callback] Starting callback handler - Build:', BUILD_TIMESTAMP, {
          hasCode: !!code,
          hasError: !!errorParam,
          error: errorParam,
        });

        // Check for error parameter from OAuth provider
        if (errorParam) {
          console.error('[OAuth Callback] OAuth provider returned error:', errorParam);
          // Even with an error, check if we have a session (might have been created)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('[OAuth Callback] Error param but session exists, redirecting');
            router.replace('/app');
            return;
          }
          setError(`OAuth error: ${errorParam}`);
          setLoading(false);
          return;
        }

        // First, always check if we already have a session
        // This handles the case where Supabase created the session server-side
        // Try multiple times with delays in case cookies are still being set
        let existingSession = null;
        for (let i = 0; i < 3; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            existingSession = session;
            break;
          }
          if (i < 2) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        if (existingSession) {
          console.log('[OAuth Callback] ✅ Session already exists, redirecting to /app');
          router.replace('/app');
          return;
        }

        if (!code) {
          console.error('[OAuth Callback] No code and no session');
          setError('No authorization code received from OAuth provider');
          setLoading(false);
          return;
        }

        // Log PKCE verifier state - check cookies, sessionStorage, and localStorage
        const cookieString = document.cookie || '';
        const allCookies = cookieString ? cookieString.split('; ').map(c => {
          const idx = c.indexOf('=');
          if (idx > 0) {
            const name = c.substring(0, idx).trim();
            const value = c.substring(idx + 1);
            return { name, hasValue: !!value, valueLength: value?.length || 0 };
          }
          return { name: c.trim(), hasValue: false, valueLength: 0 };
        }) : [];
        
        const supabaseCookies = allCookies.filter(c => 
          c.name.startsWith('sb-') ||
          c.name.includes('pkce') || 
          c.name.includes('verifier') || 
          c.name.includes('code-verifier')
        );
        
        // Check sessionStorage (primary storage for PKCE)
        // Look specifically for: sb-*-auth-token-code-verifier
        const sessionStorageKeys: string[] = [];
        const sessionStorageVerifiers: Record<string, string> = {};
        let codeVerifierFound = false;
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (
              key.includes('auth-token-code-verifier') ||
              key.startsWith('sb-') || 
              key.includes('pkce') || 
              key.includes('verifier') || 
              key.includes('code-verifier')
            )) {
              sessionStorageKeys.push(key);
              const value = sessionStorage.getItem(key);
              if (value) {
                sessionStorageVerifiers[key] = value;
                if (key.includes('auth-token-code-verifier')) {
                  codeVerifierFound = true;
                  console.log('[PKCE State] ✅ Found code verifier in sessionStorage:', key, 'value length:', value.length);
                }
              }
            }
          }
        } catch (e) {
          // sessionStorage might not be available
        }
        
        // Also check cookies for the code verifier
        const codeVerifierInCookies = supabaseCookies.find(c => c.name.includes('auth-token-code-verifier'));
        if (codeVerifierInCookies) {
          console.log('[PKCE State] ✅ Found code verifier in cookies:', codeVerifierInCookies.name);
        }
        
        // Check localStorage as fallback
        let localStorageVerifier = null;
        try {
          localStorageVerifier = localStorage.getItem('sb-pkce-verifier');
        } catch (e) {
          // localStorage might not be available
        }
        
        console.log('[PKCE State] Before exchange:', {
          hasCookieString: !!cookieString,
          cookieStringLength: cookieString.length,
          allCookieNames: allCookies.map(c => c.name),
          supabaseCookies: supabaseCookies.map(c => ({
            name: c.name,
            hasValue: c.hasValue,
            valueLength: c.valueLength,
          })),
          codeVerifierFound: codeVerifierFound || !!codeVerifierInCookies,
          sessionStorageKeys,
          sessionStorageVerifiers: Object.keys(sessionStorageVerifiers),
          localStorageVerifier: localStorageVerifier ? 'present' : 'missing',
          fullCookieString: cookieString,
        });
        
        // If code verifier is not found, log a detailed error
        if (!codeVerifierFound && !codeVerifierInCookies) {
          console.error('[PKCE State] ❌ Code verifier NOT FOUND in any storage!');
          console.error('[PKCE State] This will cause the exchange to fail.');
        }

        // Small delay to ensure cookies are fully available (especially after redirect)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Exchange authorization code for session
        console.log('[OAuth Callback] Calling exchangeCodeForSession with code:', code);
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        console.log('[OAuth Callback] Exchange response:', { 
          hasData: !!data,
          hasSession: !!data?.session,
          hasError: !!exchangeError,
          errorMessage: exchangeError?.message,
        });

        // If exchange fails, always check for session (Supabase might have created it server-side)
        if (exchangeError) {
          console.error('[OAuth Error] Exchange failed:', {
            message: exchangeError.message,
            status: exchangeError.status,
            code: exchangeError.code,
          });
          
          // Always check for session - even if exchange failed, session might exist
          // This is especially important for flow state errors where the session might
          // have been created server-side by Supabase
          // Try multiple times with increasing delays
          console.log('[OAuth Callback] Checking for session after exchange error (multiple attempts)...');
          
          for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
            const { data: { session: fallbackSession } } = await supabase.auth.getSession();
            if (fallbackSession) {
              console.log(`[OAuth Callback] ✅ Session found on attempt ${attempt + 1}, redirecting to /app`);
              router.replace('/app');
              return;
            }
            console.log(`[OAuth Callback] Attempt ${attempt + 1}: No session yet...`);
          }
          
          // Final fallback: if we have a code but exchange failed and no session found,
          // redirect to /app anyway and let middleware handle it
          // The middleware will check for session and redirect to login if needed
          // This handles edge cases where session exists but isn't detected here
          console.log('[OAuth Callback] Exchange failed, no session detected, but redirecting to /app anyway');
          console.log('[OAuth Callback] Middleware will handle session check and redirect appropriately');
          router.replace('/app');
          return;
        }

        if (data?.session) {
          console.log('[OAuth Success] Session established for user:', data.session.user.id);
          console.log('[OAuth Callback] Redirecting to /app...');
          router.replace('/app');
        } else {
          // No session in response, but check one more time
          console.log('[OAuth Callback] No session in response, checking again...');
          await new Promise(resolve => setTimeout(resolve, 200));
          const { data: { session: finalSession } } = await supabase.auth.getSession();
          if (finalSession) {
            console.log('[OAuth Callback] ✅ Session found on final check, redirecting');
            router.replace('/app');
          } else {
            console.error('[OAuth Error] No session in response or final check');
            setError('No session returned from OAuth provider');
            setLoading(false);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[OAuth Exception]', errorMessage);
        setError(errorMessage);
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F0F0F]">
        <div className="text-center">
          {/* Very prominent build indicator for callback page */}
          <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold z-50 border-2 border-yellow-400 shadow-lg">
            🔴 CALLBACK BUILD: {BUILD_TIMESTAMP}
          </div>
          <div className="fixed top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold z-50">
            📍 You are on /auth/callback page
          </div>
          <p className="text-lg font-semibold text-white">Completing sign in...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait while we authenticate you</p>
          <p className="text-xs text-gray-500 mt-4">Check console for build info</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F0F0F]">
        <div className="text-center">
          {/* Very prominent build indicator for callback page */}
          <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold z-50 border-2 border-yellow-400 shadow-lg">
            🔴 CALLBACK BUILD: {BUILD_TIMESTAMP}
          </div>
          <div className="fixed top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold z-50">
            📍 You are on /auth/callback page
          </div>
          <p className="text-lg font-semibold text-red-600">Authentication Error</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
          <p className="text-xs text-gray-500 mt-2">If you see "CALLBACK BUILD" above, you have the latest code</p>
          <a
            href="/login"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return null;
}
