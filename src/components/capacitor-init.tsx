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

// Best-effort early listener: persist any deep link quickly so cold starts don't lose it
try {
  if (typeof window !== 'undefined' && (window as any).Capacitor && !(window as any).__cap_pending_link_installed) {
    try {
      const { App } = require('@capacitor/app');
      App.addListener('appUrlOpen', (data: { url: string }) => {
        try {
          if (data?.url) {
            try { localStorage.setItem('pendingDeepLink', data.url); } catch (e) { /* ignore */ }
            try { window.dispatchEvent(new CustomEvent('cap_pending_deeplink', { detail: { url: data.url } })); } catch (e) { }
            console.log('[Capacitor Early] persisted pendingDeepLink:', data.url);
          }
        } catch (e) {
          console.warn('[Capacitor Early] could not persist pendingDeepLink', e);
        }
      });
      (window as any).__cap_pending_link_installed = true;
      console.log('[Capacitor Early] appUrlOpen early listener installed');
    } catch (e) {
      console.warn('[Capacitor Early] failed to install early appUrlOpen listener', e);
    }
  }
} catch (e) {
  console.warn('[Capacitor Early] unexpected error while installing early listener', e);
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
          logToXcode('log', '[CapacitorInit] Adding enhanced appUrlOpen listener for deep links...');
          // Track processed URLs to prevent duplicate handling
          let processedUrls = new Set<string>();

          // Centralized handler for deep links - persists pending deep links and provides retry support
          async function processDeepLink(rawUrl: string) {
            try {
              logToXcode('log', '[Capacitor] processDeepLink called with URL:', rawUrl);

              // Persist pending deep link so a cold start or page reload can re-process it
              try {
                localStorage.setItem('pendingDeepLink', rawUrl);
              } catch (e) {
                logToXcode('warn', '[Capacitor] Could not write pendingDeepLink to localStorage:', String(e));
              }

              if (!rawUrl) {
                logToXcode('warn', '[Capacitor] processDeepLink called with empty url');
                return;
              }

              if (processedUrls.has(rawUrl)) {
                logToXcode('warn', '[Capacitor] URL already processed, ignoring:', rawUrl);
                return;
              }
              processedUrls.add(rawUrl);

              if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
                logToXcode('warn', '[Capacitor] Already on callback page, ignoring deep link to prevent loop');
                return;
              }

              const url = new URL(rawUrl);
              const code = url.searchParams.get('code');
              const googleToken = url.searchParams.get('google_token');
              const googleRefresh = url.searchParams.get('google_refresh');
              const fromSupabase = url.searchParams.get('from_supabase');

              // Prevent processing the same code across reloads (avoid infinite loops on failures)
              try {
                if (code) {
                  const processed = JSON.parse(localStorage.getItem('processedDeepLinkCodes') || '[]');
                  if (processed.includes(code)) {
                    logToXcode('warn', '[Capacitor] Code already processed previously, skipping:', code.substring(0, 20) + '...');
                    return;
                  }
                }
              } catch (e) {
                // ignore parsing errors
              }

              logToXcode('log', '[Capacitor] OAuth callback detected:', {
                hasCode: !!code,
                hasToken: !!googleToken,
                fromSupabase: fromSupabase === 'true',
              });

              if (!code) {
                logToXcode('warn', '[Capacitor] No code found in deep link, redirecting to /debug');
                window.location.href = '/debug';
                return;
              }

              // Provide a persisted marker for this exchange attempt
              try {
                localStorage.setItem('lastExchangeAttempt', JSON.stringify({ codePreview: code.substring(0, 16) + '...', ts: Date.now() }));
              } catch (e) {
                logToXcode('warn', '[Capacitor] Could not write lastExchangeAttempt to localStorage:', String(e));
              }

              logToXcode('log', '[Capacitor] ✅ Exchanging code on client (PKCE verifier is here)');
              logToXcode('log', '[Capacitor] Code received:', code.substring(0, 20) + '...');

              try {
                const { createClient } = await import('@/utils/supabase/client');
                
                // Check for PKCE verifier before creating client
                let pkceFound = false;
                try {
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('sb-') && key.includes('code-verifier')) {
                      const value = localStorage.getItem(key);
                      if (value) {
                        pkceFound = true;
                        logToXcode('log', '[Capacitor] ✅ PKCE verifier found in localStorage before exchange:', key.substring(0, 30) + '...');
                        break;
                      }
                    }
                  }
                  if (!pkceFound) {
                    logToXcode('warn', '[Capacitor] ⚠️ PKCE verifier NOT found in localStorage before exchange');
                  }
                } catch (e) {
                  logToXcode('warn', '[Capacitor] Could not check localStorage for PKCE:', String(e));
                }
                
                const supabase = createClient();

                logToXcode('log', '[Capacitor] Supabase client created, exchanging code for session...');

                const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                  logToXcode('error', '[Capacitor] ❌ Session exchange failed:', {
                    errorMessage: error.message,
                    errorCode: error.status,
                    errorName: error.name,
                  });

                  try { localStorage.setItem('lastAuthError', JSON.stringify({ message: error.message, code: error.status, name: error.name, ts: Date.now() })); } catch {}

                  // Handle PKCE missing specially to avoid repeated retries and loops
                  const isPKCEMissing = error.name === 'AuthPKCECodeVerifierMissingError' || String(error.message).includes('PKCE code verifier not found');
                  if (isPKCEMissing) {
                    logToXcode('warn', '[Capacitor] PKCE verifier missing — clearing pending deep link and showing debug');
                    try { localStorage.removeItem('pendingDeepLink'); } catch {}
                    try { // mark the code as processed to avoid reprocessing across reloads
                      const processed = JSON.parse(localStorage.getItem('processedDeepLinkCodes') || '[]');
                      processed.push(code);
                      localStorage.setItem('processedDeepLinkCodes', JSON.stringify(processed));
                    } catch (e) {}

                    window.location.href = '/debug?error=pkce_missing';
                    return;
                  }

                  // For other errors, surface the debug page so we don't show a blank screen
                  window.location.href = '/debug?error=session_exchange_failed';
                  return;
                }

                if (!data?.session) {
                  logToXcode('error', '[Capacitor] ❌ No session in exchange response');
                  try { localStorage.setItem('lastAuthError', JSON.stringify({ message: 'no_session', ts: Date.now() })); } catch {}
                  window.location.href = '/debug?error=no_session';
                  return;
                }

                logToXcode('log', '[Capacitor] ✅ Session created successfully!', {
                  hasSession: !!data.session,
                  hasUser: !!data.session?.user,
                  userId: data.session?.user?.id,
                  hasProviderToken: !!data.session?.provider_token,
                });

                try {
                  localStorage.setItem('lastAuthSuccess', JSON.stringify({ userId: data.session.user.id, ts: Date.now() }));
                  // clear pending deep link on success
                  localStorage.removeItem('pendingDeepLink');
                  // also mark code processed to prevent reprocessing if startup repeats
                  try {
                    const processed = JSON.parse(localStorage.getItem('processedDeepLinkCodes') || '[]');
                    processed.push(code);
                    localStorage.setItem('processedDeepLinkCodes', JSON.stringify(processed));
                  } catch (e) {}
                } catch (e) {
                  logToXcode('warn', '[Capacitor] Could not update localStorage after success:', String(e));
                }

                // Navigate to app after successful exchange
                logToXcode('log', '[Capacitor] Navigating to /app...');
                window.location.href = '/app?auth_complete=true';
                return;

              } catch (exchangeErr: any) {
                logToXcode('error', '[Capacitor] ❌ Error during client-side exchange:', {
                  name: exchangeErr?.name,
                  message: exchangeErr?.message,
                  stack: exchangeErr?.stack,
                });

                try { localStorage.setItem('lastAuthError', JSON.stringify({ message: exchangeErr?.message || String(exchangeErr), stack: exchangeErr?.stack, ts: Date.now() })); } catch {}

                // Navigate to debug page to surface error instead of blank screen
                window.location.href = '/debug?error=exchange_exception';
                return;
              }
            } catch (err: any) {
              logToXcode('error', '[Capacitor] ❌ Unexpected error in processDeepLink:', {
                message: err?.message,
                stack: err?.stack,
              });
              try { localStorage.setItem('lastAuthError', JSON.stringify({ message: err?.message || String(err), stack: err?.stack || null, ts: Date.now() })); } catch {}
              window.location.href = '/debug?error=unexpected';
            }
          }

          // Listen for events from native
          App.addListener('appUrlOpen', (data: { url: string }) => {
            logToXcode('log', '[Capacitor] ========== APP URL OPEN LISTENER TRIGGERED ==========', data.url);
            try {
              if (data && data.url) {
                processDeepLink(data.url);
              } else {
                logToXcode('warn', '[Capacitor] appUrlOpen fired but no url present', data);
              }
            } catch (err: any) {
              logToXcode('error', '[CapacitorInit] ❌ Error handling appUrlOpen event:', {
                error: err,
                errorMessage: err?.message,
                errorStack: err?.stack,
              });
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

          // Handle cold starts - ask native if there's a launch URL
          (async () => {
            try {
              const maybeLaunch = await (App as any).getLaunchUrl?.();
              const launchUrl = maybeLaunch?.url || maybeLaunch?.value || null;
              if (launchUrl) {
                logToXcode('log', '[Capacitor] getLaunchUrl returned:', launchUrl);
                // Process it asynchronously
                setTimeout(() => void processDeepLink(launchUrl), 50);
              } else {
                // No launch url - but check pendingDeepLink in storage in case it was saved earlier
                try {
                  const pending = localStorage.getItem('pendingDeepLink');
                  if (pending) {
                    logToXcode('log', '[Capacitor] Pending deep link found in storage on startup:', pending);
                    setTimeout(() => void processDeepLink(pending), 50);
                  }
                } catch (e) {
                  logToXcode('warn', '[Capacitor] Could not read pendingDeepLink from localStorage:', String(e));
                }
              }
            } catch (err: any) {
              logToXcode('warn', '[Capacitor] getLaunchUrl is not available or failed:', {
                errorMessage: err?.message,
                errorStack: err?.stack,
              });
            }
          })();

          // Expose a retry event that the debug page can trigger
          try {
            window.addEventListener('retryDeepLink', () => {
              try {
                const pending = localStorage.getItem('pendingDeepLink');
                if (pending) {
                  logToXcode('log', '[Capacitor] retryDeepLink event triggered, re-processing:', pending);
                  void processDeepLink(pending);
                } else {
                  logToXcode('warn', '[Capacitor] retryDeepLink event triggered but no pendingDeepLink found');
                }
              } catch (e) {
                logToXcode('error', '[Capacitor] Error during retryDeepLink handler:', String(e));
              }
            });
          } catch (e) {
            logToXcode('warn', '[Capacitor] Could not add retryDeepLink listener:', String(e));
          }
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
