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
        const supabase = createClient();
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');

        // Check for error parameter from OAuth provider
        if (errorParam) {
          // Even with an error, check if we have a session (might have been created)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace('/app');
            return;
          }
          setError(`OAuth error: ${errorParam}`);
          setLoading(false);
          return;
        }

        // First, check if we already have a session
        // This handles the case where Supabase created the session server-side
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
          router.replace('/app');
          return;
        }

        if (!code) {
          setError('No authorization code received from OAuth provider');
          setLoading(false);
          return;
        }

        // Small delay to ensure cookies are fully available (especially after redirect)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Exchange authorization code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        // If exchange fails, check for session (Supabase might have created it server-side)
        if (exchangeError) {
          // Try multiple times with increasing delays
          for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
            const { data: { session: fallbackSession } } = await supabase.auth.getSession();
            if (fallbackSession) {
              router.replace('/app');
              return;
            }
          }
          
          // Final fallback: redirect to /app and let middleware handle it
          router.replace('/app');
          return;
        }

        if (data?.session) {
          router.replace('/app');
        } else {
          // No session in response, check one more time
          await new Promise(resolve => setTimeout(resolve, 200));
          const { data: { session: finalSession } } = await supabase.auth.getSession();
          if (finalSession) {
            router.replace('/app');
          } else {
            setError('No session returned from OAuth provider');
            setLoading(false);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
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
          <p className="text-lg font-semibold text-white">Completing sign in...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait while we authenticate you</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F0F0F]">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Authentication Error</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
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
