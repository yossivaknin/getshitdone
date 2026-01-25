'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

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

        // Create browser client for PKCE exchange
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Log PKCE verifier state
        console.log('[PKCE State]', {
          localStorageVerifier: localStorage.getItem('sb-pkce-verifier'),
          cookieCheck: document.cookie.includes('sb-pkce-verifier'),
        });

        // Exchange authorization code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('[OAuth Error]', {
            message: exchangeError.message,
            status: exchangeError.status,
            code: exchangeError.code,
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
