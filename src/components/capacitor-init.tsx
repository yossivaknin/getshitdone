'use client'

import { useEffect } from 'react';

// Helper to log to both console and Capacitor Console (so it shows in Xcode)
function logToXcode(level: 'log' | 'error' | 'warn', ...args: any[]) {
  // Always log to console first
  console[level](...args);
  
  // Also log to Capacitor Console if available (shows in Xcode)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    try {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      if (level === 'error') {
      } else if (level === 'warn') {
      } else {
      }
    } catch (err) {
      // Capacitor Console not available, that's okay
    }
  }
}

// Intercept Capacitor bridge errors directly
if (typeof window !== 'undefined') {
  // Store original Capacitor if it exists
  const originalCapacitor = (window as any).Capacitor;
  
  // Intercept Capacitor errors
  if (originalCapacitor) {
    logToXcode('log', '[Capacitor Bridge] Intercepting Capacitor bridge...');
  }
}

// Global error handlers to catch all errors
if (typeof window !== 'undefined') {
  // Catch all unhandled errors
  window.addEventListener('error', (event) => {
    // Ignore Next.js redirect errors (they're expected and shouldn't be logged)
    const error = event.error;
    if (error && (error.digest?.startsWith('NEXT_REDIRECT') || error.message?.includes('NEXT_REDIRECT'))) {
      return; // Silently ignore redirect errors
    }
    
    // Check if error is empty or has no properties
    const errorKeys = error ? Object.keys(error) : [];
    const errorString = error ? String(error) : 'null';
    
    // If error is empty object, try to get more info
    if (error && errorKeys.length === 0 && errorString === '[object Object]') {
      logToXcode('error', '[GLOBAL ERROR HANDLER] Empty error object detected:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorPrototype: Object.getPrototypeOf(error)?.constructor?.name,
        allErrorProps: Object.getOwnPropertyNames(error),
        errorStringified: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    } else {
      logToXcode('error', '[GLOBAL ERROR HANDLER] Unhandled error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        errorStack: event.error?.stack,
        errorName: event.error?.name,
        errorMessage: event.error?.message,
        errorToString: event.error?.toString(),
        errorType: typeof event.error,
        errorKeys: errorKeys,
        errorJSON: (() => {
          try {
            return JSON.stringify(event.error, Object.getOwnPropertyNames(event.error));
          } catch {
            return 'Could not stringify error';
          }
        })(),
      });
    }
  }, true);

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    // Ignore Next.js redirect errors
    const reason = event.reason;
    if (reason && (reason.digest?.startsWith('NEXT_REDIRECT') || reason.message?.includes('NEXT_REDIRECT'))) {
      return; // Silently ignore redirect errors
    }
    
    // Check if reason is empty object
    const reasonKeys = reason ? Object.keys(reason) : [];
    const reasonString = reason ? String(reason) : 'null';
    
    if (reason && reasonKeys.length === 0 && reasonString === '[object Object]') {
      logToXcode('error', '[GLOBAL ERROR HANDLER] Empty promise rejection detected:', {
        reasonType: typeof reason,
        reasonConstructor: reason?.constructor?.name,
        allReasonProps: Object.getOwnPropertyNames(reason),
        reasonStringified: JSON.stringify(reason, Object.getOwnPropertyNames(reason)),
      });
    } else {
      logToXcode('error', '[GLOBAL ERROR HANDLER] Unhandled promise rejection:', {
        reason: event.reason,
        reasonType: typeof event.reason,
        reasonString: String(event.reason),
        reasonStack: event.reason?.stack,
        reasonName: event.reason?.name,
        reasonMessage: event.reason?.message,
        reasonJSON: (() => {
          try {
            return JSON.stringify(event.reason, Object.getOwnPropertyNames(event.reason));
          } catch {
            return 'Could not stringify reason';
          }
        })(),
      });
    }
  });
}

export function CapacitorInit() {
  useEffect(() => {
    logToXcode('log', '[CapacitorInit] Component mounted');
    
    // Only run in Capacitor environment
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      logToXcode('log', '[CapacitorInit] ✅ Capacitor detected, initializing plugins...');
      logToXcode('log', '[CapacitorInit] Capacitor object:', {
        hasPlugins: !!(window as any).Capacitor.Plugins,
        pluginNames: (window as any).Capacitor.Plugins ? Object.keys((window as any).Capacitor.Plugins) : [],
      });
      
      try {
        // Import plugins from correct packages
        logToXcode('log', '[CapacitorInit] Importing plugins...');
        const { App } = require('@capacitor/app');
        logToXcode('log', '[CapacitorInit] ✅ App imported:', !!App);
        
        const StatusBar = require('@capacitor/status-bar').StatusBar;
        logToXcode('log', '[CapacitorInit] ✅ StatusBar imported:', !!StatusBar);
        
        const SplashScreen = require('@capacitor/splash-screen').SplashScreen;
        logToXcode('log', '[CapacitorInit] ✅ SplashScreen imported:', !!SplashScreen);
        
        const { Keyboard } = require('@capacitor/keyboard');
        logToXcode('log', '[CapacitorInit] ✅ Keyboard imported:', !!Keyboard);
        
        // Hide splash screen IMMEDIATELY after app is ready
        // This prevents the timeout warning
        if (SplashScreen && SplashScreen.hide) {
          logToXcode('log', '[CapacitorInit] Hiding SplashScreen immediately...');
          SplashScreen.hide().then(() => {
            logToXcode('log', '[CapacitorInit] ✅ SplashScreen hidden successfully');
          }).catch((err: any) => {
            logToXcode('error', '[CapacitorInit] ❌ SplashScreen hide error:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          });
        } else {
          logToXcode('warn', '[CapacitorInit] ⚠️ SplashScreen or SplashScreen.hide not available');
        }
        
        // Handle app state changes
        if (App && App.addListener) {
          logToXcode('log', '[CapacitorInit] Setting up App listeners...');
          App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
            logToXcode('log', '[Capacitor] App state changed. Is active?', isActive);
          }).catch((err: any) => {
            logToXcode('error', '[CapacitorInit] ❌ Error adding appStateChange listener:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          });

          // Handle back button (Android)
          App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
            if (!canGoBack) {
              App.exitApp();
            } else {
              window.history.back();
            }
          }).catch((err: any) => {
            logToXcode('error', '[CapacitorInit] ❌ Error adding backButton listener:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          });
          
          // Handle deep links (OAuth callbacks, etc.)
          logToXcode('log', '[CapacitorInit] Adding appUrlOpen listener for deep links...');
          App.addListener('appUrlOpen', (data: { url: string }) => {
            logToXcode('log', '[Capacitor] App opened with URL:', data.url);
            
            // Handle OAuth callback deep links
            if (data.url.startsWith('com.sitrep.app://auth/callback')) {
              try {
                const url = new URL(data.url);
                const code = url.searchParams.get('code');
                const googleToken = url.searchParams.get('google_token');
                const googleRefresh = url.searchParams.get('google_refresh');
                const fromSupabase = url.searchParams.get('from_supabase');
                
                logToXcode('log', '[Capacitor] OAuth callback detected:', {
                  hasCode: !!code,
                  hasToken: !!googleToken,
                  fromSupabase: fromSupabase === 'true'
                });
                
                // Navigate to auth callback in WebView to complete session setup
                // This ensures cookies are set in the WebView context
                const callbackUrl = new URL('/auth/callback', window.location.origin);
                if (code) callbackUrl.searchParams.set('code', code);
                if (googleToken) callbackUrl.searchParams.set('google_token', googleToken);
                if (googleRefresh) callbackUrl.searchParams.set('google_refresh', googleRefresh);
                if (fromSupabase) callbackUrl.searchParams.set('from_supabase', fromSupabase);
                
                logToXcode('log', '[Capacitor] Navigating to callback URL:', callbackUrl.toString());
                
                // Try to navigate - if it fails, show error
                try {
                  window.location.href = callbackUrl.toString();
                  // Fallback: try replace if href doesn't work
                  setTimeout(() => {
                    if (window.location.href !== callbackUrl.toString()) {
                      logToXcode('warn', '[Capacitor] Initial navigation failed, trying replace...');
                      window.location.replace(callbackUrl.toString());
                    }
                  }, 500);
                } catch (navErr: any) {
                  logToXcode('error', '[CapacitorInit] ❌ Navigation error:', {
                    error: navErr,
                    errorMessage: navErr?.message,
                    callbackUrl: callbackUrl.toString()
                  });
                  // Fallback: try router if available
                  if ((window as any).router) {
                    (window as any).router.push(callbackUrl.pathname + callbackUrl.search);
                  }
                }
              } catch (err: any) {
                logToXcode('error', '[CapacitorInit] ❌ Error handling appUrlOpen:', {
                  error: err,
                  errorType: typeof err,
                  errorString: String(err),
                  errorStack: err?.stack,
                  errorMessage: err?.message,
                });
              }
            }
          }).catch((err: any) => {
            logToXcode('error', '[CapacitorInit] ❌ Error adding appUrlOpen listener:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          });
        } else {
          logToXcode('warn', '[CapacitorInit] ⚠️ App or App.addListener not available');
        }

        // Configure status bar
        if (StatusBar && StatusBar.setStyle) {
          logToXcode('log', '[CapacitorInit] Configuring StatusBar...');
          StatusBar.setOverlaysWebView({ overlay: true }).catch((err: any) => {
            logToXcode('error', '[CapacitorInit] ❌ StatusBar overlay error:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          });
          StatusBar.setStyle({ style: 'dark' }).catch((err: any) => {
            logToXcode('error', '[CapacitorInit] ❌ StatusBar style error:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          });
          StatusBar.setBackgroundColor({ color: '#1A1A1A' }).catch((err: any) => {
            logToXcode('error', '[CapacitorInit] ❌ StatusBar color error:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          });
        } else {
          logToXcode('warn', '[CapacitorInit] ⚠️ StatusBar or StatusBar.setStyle not available');
        }

        // Handle keyboard events
        if (Keyboard && Keyboard.addListener) {
          logToXcode('log', '[CapacitorInit] Setting up Keyboard listeners...');
          Keyboard.addListener('keyboardWillShow', (info: any) => {
            logToXcode('log', '[Capacitor] Keyboard will show with height:', info.keyboardHeight);
          }).catch((err: any) => {
            logToXcode('error', '[CapacitorInit] ❌ Error adding keyboardWillShow listener:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          });

          Keyboard.addListener('keyboardWillHide', () => {
            logToXcode('log', '[Capacitor] Keyboard will hide');
          }).catch((err: any) => {
            logToXcode('error', '[CapacitorInit] ❌ Error adding keyboardWillHide listener:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          });
        } else {
          logToXcode('warn', '[CapacitorInit] ⚠️ Keyboard or Keyboard.addListener not available');
        }

        logToXcode('log', '[CapacitorInit] ✅ All plugins initialized successfully');

        // Cleanup
        return () => {
          logToXcode('log', '[CapacitorInit] Cleaning up...');
          try {
            if (App && App.removeAllListeners) {
              App.removeAllListeners();
            }
            if (Keyboard && Keyboard.removeAllListeners) {
              Keyboard.removeAllListeners();
            }
          } catch (err: any) {
            logToXcode('error', '[CapacitorInit] ❌ Cleanup error:', {
              error: err,
              errorType: typeof err,
              errorString: String(err),
              errorStack: err?.stack,
              errorMessage: err?.message,
            });
          }
        };
      } catch (error: any) {
        logToXcode('error', '[CapacitorInit] ❌❌❌ CRITICAL ERROR initializing Capacitor plugins:', {
          error: error,
          errorType: typeof error,
          errorString: String(error),
          errorStack: error?.stack,
          errorMessage: error?.message,
          errorName: error?.name,
          errorCode: error?.code,
          errorJSON: (() => {
            try {
              return JSON.stringify(error, Object.getOwnPropertyNames(error));
            } catch {
              return 'Could not stringify error';
            }
          })(),
        });
      }
    } else {
      logToXcode('log', '[CapacitorInit] ⚠️ Capacitor not detected - running in web browser');
    }
  }, []);

  return null;
}
