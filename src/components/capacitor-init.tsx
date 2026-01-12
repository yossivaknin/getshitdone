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
          // Track processed URLs to prevent duplicate handling
          let processedUrls = new Set<string>();
          
          App.addListener('appUrlOpen', (data: { url: string }) => {
            logToXcode('log', '[Capacitor] App opened with URL:', data.url);
            
            // Prevent processing the same URL multiple times
            if (processedUrls.has(data.url)) {
              logToXcode('warn', '[Capacitor] URL already processed, ignoring:', data.url);
              return;
            }
            
            // Handle OAuth callback deep links
            if (data.url.startsWith('com.sitrep.app://auth/callback')) {
              // Mark as processed immediately
              processedUrls.add(data.url);
              
              // Also check if we're already on the callback page to prevent loops
              if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
                logToXcode('warn', '[Capacitor] Already on callback page, ignoring deep link to prevent loop');
                return;
              }
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
                
                                // Use fetch to call callback route, get cookies, then navigate
                // This avoids white screen from redirect
                if (code) {
                  logToXcode('log', '[Capacitor] Using fetch to call callback route...');
                  logToXcode('log', '[Capacitor] Code received:', code.substring(0, 20) + '...');
                  
                  (async () => {
                    try {
                      const callbackUrl = new URL('/auth/callback', window.location.origin);
                      callbackUrl.searchParams.set('code', code);
                      callbackUrl.searchParams.set('from_supabase', 'true');
                      callbackUrl.searchParams.set('capacitor', 'true');
                      
                      logToXcode('log', '[Capacitor] ========== FETCHING CALLBACK ROUTE ==========');
                      logToXcode('log', '[Capacitor] Callback URL:', callbackUrl.toString());
                      logToXcode('log', '[Capacitor] URL origin:', callbackUrl.origin);
                      logToXcode('log', '[Capacitor] URL pathname:', callbackUrl.pathname);
                      logToXcode('log', '[Capacitor] URL search params:', callbackUrl.search);
                      logToXcode('log', '[Capacitor] Current window location:', window.location.href);
                      logToXcode('log', '[Capacitor] Window origin:', window.location.origin);
                      
                      // Fetch with credentials to get cookies
                      const response = await fetch(callbackUrl.toString(), {
                        method: 'GET',
                        credentials: 'include',
                        redirect: 'manual', // Don't follow redirect automatically
                      });
                      
                      logToXcode('log', '[Capacitor] Callback response:', {
                        status: response.status,
                        statusText: response.statusText,
                        redirected: response.redirected,
                        url: response.url,
                        headers: Object.fromEntries(response.headers.entries()),
                      });
                      
                      // Log response body if it's an error
                      if (response.status >= 400) {
                        try {
                          const text = await response.text();
                          // Log first 1000 chars, then try to extract error message
                          logToXcode('error', '[Capacitor] Callback error response body (first 1000 chars):', text.substring(0, 1000));
                          
                          // Try to extract error message from HTML - multiple patterns
                          // Pattern 1: <pre>Error Message</pre>
                          const errorMatch1 = text.match(/<strong>Error Message:<\/strong>\s*<pre[^>]*>([^<]+)<\/pre>/is);
                          // Pattern 2: <pre>...</pre> after "Error Message:"
                          const errorMatch2 = text.match(/Error Message:[\s\S]*?<pre[^>]*>([^<]+)<\/pre>/is);
                          // Pattern 3: Just look for any <pre> with error-like content
                          const errorMatch3 = text.match(/<pre[^>]*>([^<]{20,500})<\/pre>/is);
                          
                          if (errorMatch1) {
                            logToXcode('error', '[Capacitor] ✅ Extracted error message (pattern 1):', errorMatch1[1].trim());
                          } else if (errorMatch2) {
                            logToXcode('error', '[Capacitor] ✅ Extracted error message (pattern 2):', errorMatch2[1].trim());
                          } else if (errorMatch3) {
                            logToXcode('error', '[Capacitor] ✅ Extracted error message (pattern 3):', errorMatch3[1].trim().substring(0, 200));
                          } else {
                            logToXcode('warn', '[Capacitor] ⚠️ Could not extract error message from HTML');
                            // Log a larger chunk to help debug
                            const errorSection = text.match(/<h1[^>]*>.*?<\/h1>([\s\S]{0,500})/i);
                            if (errorSection) {
                              logToXcode('error', '[Capacitor] Error section HTML:', errorSection[1].substring(0, 500));
                            }
                          }
                          
                          // Extract error type
                          const errorTypeMatch = text.match(/<strong>Error Type:<\/strong>\s*<pre[^>]*>([^<]+)<\/pre>/is);
                          if (errorTypeMatch) {
                            logToXcode('error', '[Capacitor] ✅ Extracted error type:', errorTypeMatch[1].trim());
                          }
                        } catch (e) {
                          logToXcode('warn', '[Capacitor] Could not read error response body:', e);
                        }
                      }
                      
                      // Get redirect location
                      const redirectLocation = response.headers.get('location');
                      
                      if (redirectLocation) {
                        logToXcode('log', '[Capacitor] Redirect location:', redirectLocation);
                        // Parse redirect URL
                        const finalUrl = new URL(redirectLocation, window.location.origin);
                        logToXcode('log', '[Capacitor] Final URL:', finalUrl.toString());
                        
                        // Wait a bit for cookies to be set
                        setTimeout(() => {
                          logToXcode('log', '[Capacitor] Navigating to final URL...');
                          window.location.href = finalUrl.toString();
                        }, 300);
                      } else if (response.status === 302 || response.status === 307) {
                        // Redirect status but no location - navigate to /app
                        logToXcode('warn', '[Capacitor] Redirect status but no location, navigating to /app');
                        setTimeout(() => {
                          window.location.href = '/app?auth_complete=true';
                        }, 300);
                      } else {
                        logToXcode('warn', '[Capacitor] Unexpected response, navigating to /app');
                        setTimeout(() => {
                          window.location.href = '/app?auth_complete=true';
                        }, 300);
                      }
                    } catch (err: any) {
                      logToXcode('error', '[Capacitor] ❌ Fetch error:', {
                        error: err?.message,
                        errorStack: err?.stack,
                      });
                      // Fallback: try direct navigation
                      const callbackUrl = new URL('/auth/callback', window.location.origin);
                      callbackUrl.searchParams.set('code', code);
                      callbackUrl.searchParams.set('from_supabase', 'true');
                      callbackUrl.searchParams.set('capacitor', 'true');
                      window.location.href = callbackUrl.toString();
                    }
                  })();
                  return;
                }
                
                // Legacy: Client-side exchange (kept as fallback but shouldn't be reached)
                if (code && fromSupabase === 'true') {
                  logToXcode('log', '[Capacitor] Exchanging Supabase code for session directly...');
                  logToXcode('log', '[Capacitor] Code received:', code.substring(0, 20) + '...');
                  logToXcode('log', '[Capacitor] Exchanging Supabase code for session directly...');
                  logToXcode('log', '[Capacitor] Code received:', code.substring(0, 20) + '...');
                  
                  (async () => {
                    try {
                      // Dynamically import Supabase client to avoid SSR issues
                      const { createClient } = await import('@/utils/supabase/client');
                      const supabase = createClient();
                      
                      logToXcode('log', '[Capacitor] Supabase client created, exchanging code...');
                      
                      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                      
                      if (error) {
                        logToXcode('error', '[Capacitor] ❌ Session exchange error:', {
                          error: error.message,
                          errorCode: error.status,
                        });
                        window.location.href = '/login?error=session_exchange_failed';
                        return;
                      }
                      
                      logToXcode('log', '[Capacitor] Session exchange response:', {
                        hasData: !!data,
                        hasSession: !!data?.session,
                        hasUser: !!data?.session?.user,
                        hasProviderToken: !!data?.session?.provider_token,
                        error: error ? error.message : null,
                      });
                      
                      if (data?.session) {
                        logToXcode('log', '[Capacitor] ✅ Session created successfully');
                        logToXcode('log', '[Capacitor] User ID:', data.session.user.id);
                        logToXcode('log', '[Capacitor] Has provider token:', !!data.session.provider_token);
                        
                        // Extract Google token if available
                        const providerToken = data.session.provider_token;
                        const providerRefresh = data.session.provider_refresh_token;
                        
                        // Build redirect URL with tokens
                        const appUrl = new URL('/app', window.location.origin);
                        if (providerToken) {
                          appUrl.searchParams.set('google_token', providerToken);
                          logToXcode('log', '[Capacitor] Google token extracted from session');
                        }
                        if (providerRefresh) {
                          appUrl.searchParams.set('google_refresh', providerRefresh);
                        }
                        appUrl.searchParams.set('from_supabase', 'true');
                        appUrl.searchParams.set('auth_complete', 'true');
                        
                        logToXcode('log', '[Capacitor] Navigating to app:', appUrl.toString());
                        
                        // Verify session is actually set before navigating
                        const currentSession = await supabase.auth.getSession();
                        logToXcode('log', '[Capacitor] Session verification:', {
                          hasSession: !!currentSession?.data?.session,
                          userId: currentSession?.data?.session?.user?.id,
                        });
                        
                        if (!currentSession?.data?.session) {
                          logToXcode('error', '[Capacitor] ❌ Session not found after exchange, redirecting to login');
                          window.location.href = '/login?error=session_not_persisted';
                          return;
                        }
                        
                        // Use a longer delay to ensure session cookies are set and middleware can see them
                        logToXcode('log', '[Capacitor] Waiting 500ms for session to persist...');
                        setTimeout(() => {
                          logToXcode('log', '[Capacitor] Navigating to app now...');
                          window.location.href = appUrl.toString();
                        }, 500);
                      } else {
                        logToXcode('warn', '[Capacitor] No session in response, redirecting to login');
                        window.location.href = '/login?error=no_session';
                      }
                    } catch (err: any) {
                      logToXcode('error', '[Capacitor] ❌ Exception during code exchange:', {
                        errorName: err?.name,
                        errorMessage: err?.message,
                        errorStack: err?.stack,
                        errorString: String(err),
                        errorType: typeof err,
                      });
                      logToXcode('error', '[CapacitorInit] ❌ Error exchanging code:', {
                        error: err,
                        errorMessage: err?.message,
                        errorStack: err?.stack,
                      });
                      // Fallback: try server-side callback
                      logToXcode('warn', '[Capacitor] Falling back to server-side callback...');
                      const callbackUrl = new URL('/auth/callback', window.location.origin);
                      callbackUrl.searchParams.set('code', code);
                      if (googleToken) callbackUrl.searchParams.set('google_token', googleToken);
                      if (googleRefresh) callbackUrl.searchParams.set('google_refresh', googleRefresh);
                      callbackUrl.searchParams.set('from_supabase', fromSupabase || 'true');
                      window.location.href = callbackUrl.toString();
                    }
                  })();
                } else {
                  // No code or not from Supabase - use server-side callback
                  logToXcode('log', '[Capacitor] Using server-side callback route...');
                  const callbackUrl = new URL('/auth/callback', window.location.origin);
                  if (code) callbackUrl.searchParams.set('code', code);
                  if (googleToken) callbackUrl.searchParams.set('google_token', googleToken);
                  if (googleRefresh) callbackUrl.searchParams.set('google_refresh', googleRefresh);
                  if (fromSupabase) callbackUrl.searchParams.set('from_supabase', fromSupabase);
                  
                  logToXcode('log', '[Capacitor] Navigating to callback URL:', callbackUrl.toString());
                  window.location.href = callbackUrl.toString();
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
