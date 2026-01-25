'use client'

import { Suspense } from 'react';
import { loginWithGoogle } from './actions';

function LoginForm() {
  return (
    <div 
      className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center p-4 safe-top" 
      style={{ paddingTop: `calc(1rem + env(safe-area-inset-top))` }}
    >
      {/* DEBUG: Build time - 2026-01-09 21:24:35 */}
      <div className="fixed top-16 right-4 bg-black/80 text-white px-3 py-2 rounded text-xs font-mono z-50">
        Build: 2026-01-09 21:24:35
      </div>
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
            SITREP
          </h1>
          <p className="text-gray-400 text-sm">
            Get your tasks organized, stay on track
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-8 shadow-2xl">
          {/* Welcome Text */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold mb-2">Welcome</h2>
            <p className="text-gray-400 text-sm">
              Sign in with your Google account to get started
            </p>
          </div>

          {/* Google Sign In Button */}
          <div>
            <button
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const { createClient } = await import('@/utils/supabase/client');
                  const supabase = createClient();
                  console.log('[Login] Initiating client-side Google OAuth (PKCE verifier will be stored in cookies)');
                  // Choose redirect URL based on environment: use custom scheme for Capacitor, web callback for browser
                  const isCapacitor = typeof window !== 'undefined' && (navigator.userAgent?.includes('Capacitor') || navigator.userAgent?.includes('iPhone') || navigator.userAgent?.includes('iPad'));
                  const redirectTo = isCapacitor ? 'com.yossivaknin.sitrep://auth/callback' : `${window.location.origin}/auth/callback`;
                  console.log('[Login] Starting OAuth. isCapacitor:', isCapacitor, 'redirectTo:', redirectTo);

                  // Log cookies before OAuth
                  console.log('[Login] Cookies before OAuth:', document.cookie);
                  
                  const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { 
                      redirectTo, 
                      scopes: 'email profile https://www.googleapis.com/auth/calendar',
                      // Ensure PKCE is used (default, but explicit is better)
                      skipBrowserRedirect: false,
                    },
                  });

                  if (error) {
                    console.error('Client-side Google sign-in error', error);
                    // Fallback: show message via query param
                    window.location.href = '/login?message=' + encodeURIComponent('Google sign-in failed: ' + error.message);
                    return;
                  }

                  if (data?.url) {
                    // Wait a bit for Supabase to set the PKCE cookie
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Verify PKCE cookie is set before redirecting
                    const cookiesAfterOAuth = document.cookie;
                    const allCookies = cookiesAfterOAuth.split('; ').map(c => {
                      const idx = c.indexOf('=');
                      if (idx > 0) {
                        const name = c.substring(0, idx).trim();
                        const value = c.substring(idx + 1);
                        return { name, value, hasValue: !!value && value.length > 0 };
                      }
                      return { name: c.trim(), value: '', hasValue: false };
                    });
                    
                    const supabaseCookies = allCookies.filter(c => 
                      c.name.startsWith('sb-') || 
                      c.name.includes('pkce') || 
                      c.name.includes('verifier') ||
                      c.name.includes('code-verifier')
                    );
                    
                    const codeVerifierCookie = supabaseCookies.find(c => c.name.includes('auth-token-code-verifier'));
                    
                    // Check sessionStorage too
                    let sessionStorageVerifier = null;
                    try {
                      for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key && key.includes('auth-token-code-verifier')) {
                          sessionStorageVerifier = sessionStorage.getItem(key);
                          break;
                        }
                      }
                    } catch (e) {}
                    
                    console.log('[Login] OAuth URL received, checking storage:', {
                      allCookies: allCookies.map(c => ({ name: c.name, hasValue: c.hasValue, valueLength: c.value?.length || 0 })),
                      supabaseCookies: supabaseCookies.map(c => ({ name: c.name, hasValue: c.hasValue, valueLength: c.value?.length || 0 })),
                      codeVerifierCookie: codeVerifierCookie ? {
                        name: codeVerifierCookie.name,
                        hasValue: codeVerifierCookie.hasValue,
                        valueLength: codeVerifierCookie.value?.length || 0,
                      } : null,
                      sessionStorageVerifier: sessionStorageVerifier ? {
                        hasValue: true,
                        valueLength: sessionStorageVerifier.length,
                      } : null,
                      cookieString: cookiesAfterOAuth,
                    });
                    
                    // Warn if code verifier is missing or empty
                    if (!codeVerifierCookie?.hasValue && !sessionStorageVerifier) {
                      console.error('[Login] ⚠️ Code verifier cookie is missing or empty! This will cause OAuth to fail.');
                    } else if (codeVerifierCookie && !codeVerifierCookie.hasValue && sessionStorageVerifier) {
                      console.warn('[Login] ⚠️ Code verifier cookie is empty, but found in sessionStorage. This should still work.');
                    }
                    
                    // Additional delay to ensure cookie is fully persisted
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Navigate to the OAuth URL (this should open Safari and preserve PKCE in this WebView)
                    console.log('[Login] Redirecting to OAuth URL');
                    window.location.href = data.url;
                    return;
                  }

                  // If no URL returned, show an error
                  window.location.href = '/login?message=' + encodeURIComponent('Google OAuth failed to start.');
                } catch (err: any) {
                  console.error('Exception starting client-side Google OAuth', err);
                  window.location.href = '/login?message=' + encodeURIComponent('Google sign-in exception: ' + (err?.message || String(err)));
                }
              }}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Info Text */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy.
              <br />
              New users will automatically create an account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            Secure authentication powered by Google
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
