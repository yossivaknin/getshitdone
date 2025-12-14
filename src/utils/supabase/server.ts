import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error(`Missing Supabase environment variables: ${missing.join(', ')}`)
    throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`)
  }

  try {
    const cookieStore = cookies()

    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // Extend session cookies to 1 year (until user signs out)
                // This applies to auth session cookies (sb-*-auth-token)
                if (name.includes('auth-token')) {
                  cookieStore.set(name, value, {
                    ...options,
                    maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'production',
                    httpOnly: true,
                  })
                } else {
                  cookieStore.set(name, value, options)
                }
              })
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
  } catch (error: any) {
    console.error('Error creating Supabase client:', error?.message || error)
    throw new Error(`Failed to create Supabase client: ${error?.message || 'Unknown error'}`)
  }
}

