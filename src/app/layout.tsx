import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { PWARegister } from '@/components/pwa-register';
import { CapacitorInit } from '@/components/capacitor-init';
import { ErrorDisplay } from '@/components/error-display';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "SitRep | The AI-Powered Execution Engine",
  description: "Stop planning. Start executing. SitRep auto-blocks your calendar, chunks large projects, and forces you to finish your work using AI accountability.",
  keywords: ["productivity app", "time blocking", "google calendar integration", "kanban board", "task manager", "Get Shit Done", "auto-scheduler", "AI task manager"],
  manifest: "/manifest.json",
  themeColor: "#1F2937",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SitRep",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Store errors to display on screen
                window.__CAPACITOR_ERRORS__ = [];
                
                function addErrorToDisplay(type, error) {
                  window.__CAPACITOR_ERRORS__.push({
                    type: type,
                    message: error?.message || String(error),
                    stack: error?.stack,
                    timestamp: new Date().toISOString(),
                    error: error
                  });
                  
                  // Dispatch event to update error display
                  window.dispatchEvent(new CustomEvent('capacitorError', {
                    detail: { type, error }
                  }));
                  
                  console.error('[EARLY ERROR HANDLER]', type + ':', error);
                  // Also serialize the error for environments (like Capacitor WebView)
                  try {
                    const serialize = (err) => {
                      try {
                        return JSON.stringify(err, Object.getOwnPropertyNames(err));
                      } catch (e) {
                        try { return String(err); } catch { return '[unserializable error]'; }
                      }
                    };

                    const errorStr = serialize(error);
                    // A concise machine-friendly log the WebView / native console can pick up
                    // If error is empty, try to get more info from the event
                    if (errorStr === '{}' || errorStr === 'null' || !errorStr) {
                      console.log('⚡️  [error] -', JSON.stringify({
                        type: 'EmptyErrorObject',
                        message: event.message || 'No error message',
                        filename: event.filename || 'Unknown',
                        lineno: event.lineno || 0,
                        colno: event.colno || 0,
                        errorType: typeof error,
                        hasError: !!error,
                        errorKeys: error ? Object.keys(error) : [],
                        allProps: error ? Object.getOwnPropertyNames(error) : []
                      }));
                    } else {
                      console.log('⚡️  [error] -', errorStr);
                    }
                  } catch (e) {
                    console.log('⚡️  [error] -', String(error));
                  }
                }
                
                console.log('[EARLY ERROR HANDLER] Setting up global error handlers...');
                
                // Catch all unhandled errors
                window.addEventListener('error', function(event) {
                  addErrorToDisplay('Unhandled Error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error,
                    stack: event.error?.stack,
                    name: event.error?.name,
                  });
                }, true);
                
                // Catch unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  addErrorToDisplay('Unhandled Promise Rejection', {
                    message: event.reason?.message || String(event.reason),
                    reason: event.reason,
                    stack: event.reason?.stack,
                    name: event.reason?.name,
                  });
                });
                
                console.log('[EARLY ERROR HANDLER] ✅ Global error handlers installed');
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-slate-950 text-slate-100">
        <ErrorDisplay />
        <CapacitorInit />
        <PWARegister />
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
