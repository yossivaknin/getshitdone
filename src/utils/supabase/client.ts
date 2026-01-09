import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Log for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Supabase Client] Initializing...', {
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
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
    
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
