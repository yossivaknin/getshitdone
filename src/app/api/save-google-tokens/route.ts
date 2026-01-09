import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { google_token, google_refresh, expires_in } = body || {}

    if (!google_token) {
      return NextResponse.json({ success: false, error: 'Missing google_token' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Save Tokens API] Missing Supabase env vars')
      return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 })
    }

    const cookieStore = cookies()

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op for API endpoint
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[Save Tokens API] Not authenticated')
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Calculate expiration
    const tokenExpiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null

    const { error } = await supabase
      .from('user_tokens')
      .upsert({
        user_id: user.id,
        google_access_token: google_token,
        google_refresh_token: google_refresh || null,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('[Save Tokens API] Upsert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Save Tokens API] Exception:', err)
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 })
  }
}
