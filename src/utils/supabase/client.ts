import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`);
  }

  try {
    // Create browser client with proper cookie configuration for PKCE
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const cookies: Array<{ name: string; value: string }> = [];
          
          // Check sessionStorage first (primary source for PKCE and state)
          try {
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              if (key && key.startsWith('sb-')) {
                const value = sessionStorage.getItem(key);
                if (value) {
                  const existing = cookies.find(c => c.name === key);
                  if (!existing) {
                    cookies.push({ name: key, value });
                  }
                }
              }
            }
          } catch (e) {
            // sessionStorage might not be available
          }
          
          // Check localStorage (important for Capacitor/mobile where sessionStorage may not persist)
          try {
            let foundInLocalStorage = 0;
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('sb-')) {
                const value = localStorage.getItem(key);
                if (value) {
                  const existing = cookies.find(c => c.name === key);
                  if (!existing) {
                    cookies.push({ name: key, value });
                    foundInLocalStorage++;
                    // Log PKCE verifier specifically for debugging
                    if (key.includes('code-verifier')) {
                      console.log('[Supabase Client] ✅ Found PKCE verifier in localStorage:', key.substring(0, 30) + '...');
                    }
                  }
                }
              }
            }
            if (foundInLocalStorage > 0) {
              console.log(`[Supabase Client] Found ${foundInLocalStorage} Supabase items in localStorage`);
            }
          } catch (e) {
            console.warn('[Supabase Client] localStorage check failed:', e);
          }
          
          // Also check cookies, but skip empty values
          if (document.cookie) {
            document.cookie.split('; ').forEach(cookie => {
              const idx = cookie.indexOf('=');
              if (idx > 0) {
                const name = cookie.substring(0, idx).trim();
                const value = cookie.substring(idx + 1);
                // Include ALL Supabase cookies (sb- prefix) with non-empty values
                if (value && name.startsWith('sb-')) {
                  const existing = cookies.find(c => c.name === name);
                  if (!existing) {
                    try {
                      cookies.push({ name, value: decodeURIComponent(value) });
                    } catch (e) {
                      cookies.push({ name, value });
                    }
                  }
                }
              }
            });
          }
          
          // Log summary for debugging
          const codeVerifierCookies = cookies.filter(c => c.name.includes('code-verifier'));
          if (codeVerifierCookies.length > 0) {
            console.log(`[Supabase Client] getAll() found ${codeVerifierCookies.length} PKCE verifier(s) from:`, {
              sessionStorage: codeVerifierCookies.some(c => {
                try {
                  return sessionStorage.getItem(c.name) === c.value;
                } catch { return false; }
              }),
              localStorage: codeVerifierCookies.some(c => {
                try {
                  return localStorage.getItem(c.name) === c.value;
                } catch { return false; }
              }),
            });
          } else {
            console.warn('[Supabase Client] getAll() found NO PKCE verifier cookies!');
          }
          
          return cookies;
        },
        setAll(cookiesToSet) {
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
                // Just remove from cookies, keep in sessionStorage
                try { 
                  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`; 
                } catch (e) {}
              }
              return;
            }
            
            // Priority 1: sessionStorage (most reliable for PKCE and state across redirects)
            try {
              sessionStorage.setItem(name, value);
              if (isCodeVerifier) {
                console.log('[Supabase Client] ✅ Stored PKCE verifier in sessionStorage:', name.substring(0, 30) + '...');
              }
            } catch (e) {
              console.warn('[Supabase Client] Failed to store in sessionStorage:', e);
            }
            
            // Priority 2: localStorage as backup (CRITICAL for Capacitor/mobile)
            try {
              localStorage.setItem(name, value);
              if (isCodeVerifier) {
                console.log('[Supabase Client] ✅ Stored PKCE verifier in localStorage:', name.substring(0, 30) + '...');
              }
            } catch (e) {
              console.warn('[Supabase Client] Failed to store in localStorage:', e);
            }
            
            // Priority 3: cookies as last resort
            try {
              const encodedValue = encodeURIComponent(value);
              const isSecure = window.location.protocol === 'https:' && !window.location.hostname.includes('localhost');
              const sameSite = 'lax';
              const maxAge = 600; // 10 minutes for PKCE and state
              
              const cookieStr = `${name}=${encodedValue};max-age=${maxAge};path=/;samesite=${sameSite}${isSecure ? ';secure' : ''}`;
              document.cookie = cookieStr;
            } catch (e) {
              // Cookie setting failed
            }
          });
        },
      },
    });
    
    return client;
  } catch (error: any) {
    throw new Error(`Failed to create Supabase client: ${error?.message || 'Unknown error'}`);
  }
}
