import { createBrowserClient } from '@supabase/ssr'

function clearAllSupabaseStorage() {
  const keysToRemove = new Set<string>();
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('sb-')) keysToRemove.add(key);
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-')) keysToRemove.add(key);
    }
    if (document.cookie) {
      document.cookie.split('; ').forEach((part) => {
        const name = part.indexOf('=') > 0 ? part.substring(0, part.indexOf('=')).trim() : '';
        if (name.startsWith('sb-')) keysToRemove.add(name);
      });
    }
    keysToRemove.forEach((key) => {
      try { sessionStorage.removeItem(key); } catch {}
      try { localStorage.removeItem(key); } catch {}
      try { document.cookie = `${key}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`; } catch {}
    });
    console.warn('[Supabase Client] Cleared all Supabase storage after token refresh failure (400/429) to stop refresh loop.');
  } catch (e) {
    console.warn('[Supabase Client] clearAllSupabaseStorage failed:', e);
  }
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`);
  }

  const customFetch: typeof fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    return fetch(input, init).then((res) => {
      if (url.includes('auth/v1/token') && url.includes('grant_type=refresh_token') && (res.status === 400 || res.status === 429)) {
        clearAllSupabaseStorage();
      }
      return res;
    });
  };

  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: customFetch },
      cookies: {
        getAll() {
          const logStorage = (source: string, name: string, value: string | null) => {
            const preview = value ? (value.length > 40 ? value.substring(0, 40) + '...' : value) : '(empty)';
            console.log(`[Supabase Client] ${source} name="${name}" value=${preview} length=${value?.length ?? 0}`);
          };

          const hasValidValue = (v: string | null): v is string => !!v && v.length > 0;

          const removeFromSessionStorage = (name: string) => {
            try {
              sessionStorage.removeItem(name);
              console.log(`[Supabase Client] Removed empty/invalid from sessionStorage: ${name}`);
            } catch (e) {}
          };
          const removeFromLocalStorage = (name: string) => {
            try {
              localStorage.removeItem(name);
              console.log(`[Supabase Client] Removed empty/invalid from localStorage: ${name}`);
            } catch (e) {}
          };
          const removeCookie = (name: string) => {
            try {
              document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              console.log(`[Supabase Client] Removed empty/invalid cookie: ${name}`);
            } catch (e) {}
          };

          const recreateCookie = (name: string, value: string) => {
            try {
              const encoded = encodeURIComponent(value);
              const isSecure = window.location.protocol === 'https:' && !window.location.hostname.includes('localhost');
              document.cookie = `${name}=${encoded};max-age=600;path=/;samesite=lax${isSecure ? ';secure' : ''}`;
              console.log(`[Supabase Client] Recreated cookie: ${name}`);
            } catch (e) {}
          };

          const byName = new Map<string, string>();
          const add = (name: string, value: string) => {
            if (!name.startsWith('sb-') || !hasValidValue(value)) return;
            const existing = byName.get(name);
            const isCodeVerifier = name.includes('code-verifier');
            if (!existing) {
              byName.set(name, value);
              return;
            }
            if (isCodeVerifier) {
              byName.set(name, value);
            } else if (value.length > (existing?.length ?? 0)) {
              byName.set(name, value);
            }
          };

          // 1) Read sessionStorage — if value missing/empty, delete and skip
          try {
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              if (!key || !key.startsWith('sb-')) continue;
              const value = sessionStorage.getItem(key);
              logStorage('sessionStorage', key, value);
              if (!hasValidValue(value)) {
                removeFromSessionStorage(key);
                continue;
              }
              add(key, value);
            }
          } catch (e) {
            console.warn('[Supabase Client] sessionStorage read failed:', e);
          }

          // 2) Read localStorage — if value missing/empty, delete and skip
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (!key || !key.startsWith('sb-')) continue;
              const value = localStorage.getItem(key);
              logStorage('localStorage', key, value);
              if (!hasValidValue(value)) {
                removeFromLocalStorage(key);
                continue;
              }
              add(key, value);
            }
          } catch (e) {
            console.warn('[Supabase Client] localStorage read failed:', e);
          }

          // 3) Read document.cookie — if value missing/empty, delete and skip
          if (document.cookie) {
            document.cookie.split('; ').forEach(cookie => {
              const idx = cookie.indexOf('=');
              if (idx <= 0) return;
              const name = cookie.substring(0, idx).trim();
              const raw = cookie.substring(idx + 1);
              if (!name.startsWith('sb-')) return;
              let value: string;
              try {
                value = raw ? decodeURIComponent(raw) : '';
              } catch {
                value = raw ?? '';
              }
              logStorage('cookie', name, value);
              if (!hasValidValue(value)) {
                removeCookie(name);
                return;
              }
              add(name, value);
            });
          }

          // 4) For each key we have: if cookie was missing/empty, recreate it from the value we have
          const cookies = Array.from(byName.entries()).map(([name, value]) => ({ name, value }));
          for (const { name, value } of cookies) {
            const fromCookie = document.cookie.split('; ').some(c => c.startsWith(name + '='));
            if (!fromCookie && hasValidValue(value)) {
              recreateCookie(name, value);
            }
            console.log(`[Supabase Client] getAll returning name="${name}" value=${value.length > 40 ? value.substring(0, 40) + '...' : value} length=${value.length}`);
          }

          return Promise.resolve(cookies);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            if (!name.startsWith('sb-')) return;

            const valuePreview = value ? (value.length > 40 ? value.substring(0, 40) + '...' : value) : '(empty)';
            console.log(`[Supabase Client] setAll name="${name}" value=${valuePreview} length=${value?.length ?? 0}`);

            const removeEverywhere = (key: string) => {
              try {
                sessionStorage.removeItem(key);
              } catch (e) {}
              try {
                localStorage.removeItem(key);
              } catch (e) {}
              try {
                document.cookie = `${key}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              } catch (e) {}
              console.log(`[Supabase Client] setAll removed from all storage: ${key}`);
            };

            if (!value || value.length === 0) {
              removeEverywhere(name);
              return;
            }

            try {
              sessionStorage.setItem(name, value);
            } catch (e) {
              console.warn('[Supabase Client] setAll sessionStorage failed:', e);
            }
            try {
              localStorage.setItem(name, value);
            } catch (e) {
              console.warn('[Supabase Client] setAll localStorage failed:', e);
            }
            try {
              const encodedValue = encodeURIComponent(value);
              const isSecure = window.location.protocol === 'https:' && !window.location.hostname.includes('localhost');
              const cookieStr = `${name}=${encodedValue};max-age=600;path=/;samesite=lax${isSecure ? ';secure' : ''}`;
              document.cookie = cookieStr;
            } catch (e) {}
          });
        },
      },
    });
    
    return client;
  } catch (error: any) {
    throw new Error(`Failed to create Supabase client: ${error?.message || 'Unknown error'}`);
  }
}
