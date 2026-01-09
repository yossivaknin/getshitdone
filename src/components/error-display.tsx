'use client'

import { useState, useEffect } from 'react';

export function ErrorDisplay() {
  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    // Get initial errors
    if (typeof window !== 'undefined' && (window as any).__CAPACITOR_ERRORS__) {
      setErrors([...(window as any).__CAPACITOR_ERRORS__]);
    }

    // Listen for new errors
    const handleError = (event: CustomEvent) => {
      setErrors(prev => [...prev, event.detail]);
    };

    window.addEventListener('capacitorError', handleError as EventListener);

    return () => {
      window.removeEventListener('capacitorError', handleError as EventListener);
    };
  }, []);

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-900/95 text-white p-4 border-b-2 border-red-500">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-bold mb-2">⚠️ Application Errors Detected</h2>
        {errors.map((error, index) => (
          <div key={index} className="mb-3 p-3 bg-red-800/50 rounded border border-red-600">
            <div className="font-semibold mb-1">{error.type}</div>
            <div className="text-sm font-mono whitespace-pre-wrap break-words">
              {error.message || String(error.error || 'Unknown error')}
            </div>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer opacity-75">Stack Trace</summary>
                <pre className="text-xs mt-1 overflow-auto max-h-40">{error.stack}</pre>
              </details>
            )}
          </div>
        ))}
        <button
          onClick={() => {
            setErrors([]);
            if (typeof window !== 'undefined') {
              (window as any).__CAPACITOR_ERRORS__ = [];
            }
          }}
          className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-sm font-semibold"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
