import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Log for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Supabase Client] Initializing with cookie support for PKCE...', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
    });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const error = `Missing Supabase environment variables: ${missing.join(', ')}`;
    console.error('[Supabase Client] ❌', error);
    throw new Error(error);
  }

  try {
    // Create browser client with cookies enabled for PKCE verifier persistence
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return document.cookie.split('; ').reduce((acc, cookie) => {
            const [name, value] = cookie.split('=');
            if (name) acc.push({ name, value: decodeURIComponent(value) });
            return acc;
          }, [] as Array<{ name: string; value: string }>);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const str = `${name}=${encodeURIComponent(value)}`;
            const expStr = options?.maxAge 
              ? `; Max-Age=${options.maxAge}`
              : options?.expires
              ? `; expires=${new Date(options.expires).toUTCString()}`
              : '';
            const pathStr = options?.path ? `; path=${options.path}` : '';
            const domainStr = options?.domain ? `; domain=${options.domain}` : '';
            const secureStr = options?.secure ? '; secure' : '';
            const sameSiteStr = options?.sameSite ? `; samesite=${options.sameSite}` : '';
            document.cookie = str + expStr + pathStr + domainStr + secureStr + sameSiteStr;
          });
        },
      },
    });
    
    // Test connection in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Supabase Client] ✅ Client created successfully');
    }
    
    return client;
  } catch (error: any) {
    console.error('[Supabase Client] ❌ Error creating client:', {
      error: error,
      errorMessage: error?.message,
      errorStack: error?.stack,
    });
    throw error;
  }
}
