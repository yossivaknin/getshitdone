'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        
        console.log('[OAuth Callback] Starting session exchange');
        console.log('[OAuth Callback] Auth code present:', !!code);

        if (!code) {
          setError('No authorization code received from OAuth provider');
          return;
        }

        // Use the client utility which now has cookie support for PKCE
        const supabase = createClient();

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

        console.log('[OAuth Callback] Exchange response:', { data, error: exchangeError });

        if (exchangeError) {
          console.error('[OAuth Error] Exchange failed:', {
            message: exchangeError.message,
            status: exchangeError.status,
            code: exchangeError.code,
            fullError: JSON.stringify(exchangeError),
          });
          setError(`OAuth error: ${exchangeError.message}`);
          return;
        }

        if (data?.session) {
          console.log('[OAuth Success] Session established for user:', data.session.user.id);
          // Redirect to settings or home
          router.replace('/settings');
        } else {
          setError('No session returned from OAuth provider');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[OAuth Exception]', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold">Completing sign in...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we authenticate you</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Authentication Error</p>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
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
