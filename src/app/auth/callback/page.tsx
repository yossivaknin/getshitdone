'use client'

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (error) {
      setStatus('error');
      setMessage(error);
    } else if (message) {
      setStatus('error');
      setMessage(message);
    } else if (code) {
      // Code is present, should be processing
      setStatus('loading');
      setMessage('Processing authentication...');
      
      // The server-side route should handle this, but if we're here,
      // something went wrong. Check if we're being redirected.
      setTimeout(() => {
        // If still on this page after 2 seconds, something is wrong
        if (window.location.pathname === '/auth/callback') {
          setStatus('error');
          setMessage('Authentication is taking longer than expected. Please try again.');
        }
      }, 2000);
    } else {
      setStatus('error');
      setMessage('No authorization code received');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center p-4">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-gray-400">{message || 'Completing authentication...'}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-red-500 mb-4">❌</div>
            <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
            <p className="text-gray-400 mb-4">{message || 'An error occurred during authentication'}</p>
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Return to Login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
