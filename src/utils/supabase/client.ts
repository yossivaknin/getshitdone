import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[Supabase Client] Initializing browser client for OAuth with PKCE...');

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const error = `Missing Supabase environment variables: ${missing.join(', ')}`;
    console.error('[Supabase Client] ❌', error);
    throw new Error(error);
  }

  try {
    // Create browser client with proper cookie configuration for PKCE
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          console.log('[PKCE Store] getAll() called - checking sessionStorage and cookies');
          const cookies: Array<{ name: string; value: string }> = [];
          
          // Check sessionStorage first (primary source for PKCE and state)
          // Return ALL Supabase-related keys (sb-* prefix) to ensure we don't miss anything
          try {
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              if (key && key.startsWith('sb-')) {
                const value = sessionStorage.getItem(key);
                if (value) {
                  // Check if we already have this cookie (avoid duplicates)
                  const existing = cookies.find(c => c.name === key);
                  if (!existing) {
                    cookies.push({ name: key, value });
                    if (key.includes('code-verifier')) {
                      console.log('[PKCE Store] ✅ Found PKCE verifier in sessionStorage:', key);
                    } else if (key.includes('state')) {
                      console.log('[PKCE Store] ✅ Found OAuth state in sessionStorage:', key);
                    } else {
                      console.log('[PKCE Store] Found Supabase cookie in sessionStorage:', key);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.warn('[PKCE Store] Could not read sessionStorage:', e);
          }
          
          // Also check cookies, but skip empty values
          // Return ALL sb-* cookies to ensure we capture state, verifier, and any other auth cookies
          if (document.cookie) {
            document.cookie.split('; ').forEach(cookie => {
              const idx = cookie.indexOf('=');
              if (idx > 0) {
                const name = cookie.substring(0, idx).trim();
                const value = cookie.substring(idx + 1);
                // Include ALL Supabase cookies (sb- prefix) with non-empty values
                if (value && name.startsWith('sb-')) {
                  // Check if we already have this from sessionStorage
                  const existing = cookies.find(c => c.name === name);
                  if (!existing) {
                    try {
                      cookies.push({ name, value: decodeURIComponent(value) });
                      if (name.includes('code-verifier')) {
                        console.log('[PKCE Store] ✅ Found PKCE verifier in cookies:', name);
                      } else if (name.includes('state')) {
                        console.log('[PKCE Store] ✅ Found OAuth state in cookies:', name);
                      }
                    } catch (e) {
                      cookies.push({ name, value });
                    }
                  }
                }
              }
            });
          }
          
          // Log summary
          const codeVerifier = cookies.find(c => c.name.includes('code-verifier'));
          const state = cookies.find(c => c.name.includes('state'));
          console.log('[PKCE Store] getAll() returning', cookies.length, 'cookies:', {
            hasCodeVerifier: !!codeVerifier,
            hasState: !!state,
            allCookieNames: cookies.map(c => c.name),
          });
          
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log('[PKCE Store] setAll() called with', cookiesToSet.length, 'items');
          
          cookiesToSet.forEach(({ name, value }) => {
            // Only process Supabase cookies (sb- prefix)
            if (!name.startsWith('sb-')) {
              return;
            }
            
            const isCodeVerifier = name.includes('code-verifier');
            const isState = name.includes('state');
            
            // Handle empty values (cleanup/removal signals from Supabase)
            if (!value) {
              if (isCodeVerifier || isState) {
                console.log('[PKCE Store] Supabase requesting cleanup for:', name);
                // Don't remove from sessionStorage yet - it might still be needed
                // Just remove from cookies
                try { 
                  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`; 
                  console.log('[PKCE Store] Cleared from cookies:', name);
                } catch (e) {}
              } else {
                console.log('[PKCE Store] Skipping empty value for:', name);
              }
              return;
            }
            
            if (isCodeVerifier) {
              console.log('[PKCE Store] 🔑 STORING CODE VERIFIER:', name, 'length:', value.length);
            } else if (isState) {
              console.log('[PKCE Store] 🔐 STORING OAUTH STATE:', name, 'length:', value.length);
            } else {
              console.log('[PKCE Store] 📦 STORING Supabase cookie:', name, 'length:', value.length);
            }
            
            // Priority 1: sessionStorage (most reliable for PKCE and state across redirects)
            try {
              sessionStorage.setItem(name, value);
              console.log('[PKCE Store] ✅ Saved to sessionStorage:', name);
            } catch (e) {
              console.warn('[PKCE Store] Failed to save to sessionStorage:', name, e);
            }
            
            // Priority 2: localStorage as backup
            try {
              localStorage.setItem(name, value);
              console.log('[PKCE Store] ✅ Saved to localStorage:', name);
            } catch (e) {
              console.warn('[PKCE Store] Failed to save to localStorage:', name, e);
            }
            
            // Priority 3: cookies as last resort
            try {
              const encodedValue = encodeURIComponent(value);
              const isSecure = window.location.protocol === 'https:' && !window.location.hostname.includes('localhost');
              const sameSite = 'lax';
              const maxAge = 600; // 10 minutes for PKCE and state
              
              const cookieStr = `${name}=${encodedValue};max-age=${maxAge};path=/;samesite=${sameSite}${isSecure ? ';secure' : ''}`;
              document.cookie = cookieStr;
              console.log('[PKCE Store] ✅ Saved to cookies:', name);
            } catch (e) {
              console.warn('[PKCE Store] Failed to save to cookies:', name, e);
            }
          });
        },
      },
    });
    
    console.log('[Supabase Client] ✅ Client created successfully');
    return client;
  } catch (error: any) {
    console.error('[Supabase Client] ❌ Error creating client:', error?.message);
    throw error;
  }
}
