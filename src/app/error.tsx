'use client'

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error with all details
    console.error('[NEXT.JS ERROR BOUNDARY] Error caught:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      digest: error.digest,
      errorType: typeof error,
      errorString: String(error),
      errorKeys: Object.keys(error),
      errorJSON: (() => {
        try {
          return JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch {
          return 'Could not stringify error';
        }
      })(),
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-auto">
      <div className="max-w-2xl w-full bg-slate-900 border border-red-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-red-400 mb-4">⚠️ Application Error</h2>
        <p className="text-slate-300 mb-4">
          A client-side exception has occurred.
        </p>
        <div className="bg-slate-800 p-4 rounded mb-4 font-mono text-xs overflow-auto max-h-96">
          <div className="text-red-400 font-bold">Error: {error.message || 'Unknown error'}</div>
          {error.name && <div className="text-yellow-400 mt-2">Name: {error.name}</div>}
          {error.digest && <div className="text-blue-400 mt-2">Digest: {error.digest}</div>}
          {error.stack && (
            <div className="text-slate-400 mt-4 whitespace-pre-wrap border-t border-slate-700 pt-4">
              {error.stack}
            </div>
          )}
        </div>
        <div className="mb-4 p-4 bg-slate-700/50 rounded border border-slate-600 text-sm">
          <p className="text-slate-300 mb-2"><strong>Debug Info:</strong></p>
          <p className="text-slate-400">Check your browser console for more details.</p>
        </div>
        <button
          onClick={reset}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
