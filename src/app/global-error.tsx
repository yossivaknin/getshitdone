'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#000', color: '#fff' }}>
          <h2 style={{ color: '#f00' }}>Global Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify({
              message: error.message,
              name: error.name,
              stack: error.stack,
              digest: error.digest,
            }, null, 2)}
          </pre>
          <button onClick={reset} style={{ marginTop: '20px', padding: '10px' }}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
