import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { taskData, workingHoursStart, workingHoursEnd, timezone } = body || {}

    if (!taskData || !taskData.id) {
      return NextResponse.json({ success: false, error: 'Missing task data' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Calendar Schedule API] Missing Supabase env vars')
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
            // no-op
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[Calendar Schedule API] Not authenticated')
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch tokens from user_tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('google_access_token, google_refresh_token')
      .eq('user_id', user.id)
      .single()

    if (tokenError || !tokens) {
      console.warn('[Calendar Schedule API] No tokens found for user', tokenError)
      return NextResponse.json({ success: false, error: 'No calendar tokens found. Please connect Google Calendar in Settings.' }, { status: 400 })
    }

    // Import scheduleTask from server actions
    const { scheduleTask } = await import('@/app/actions')

    // Call scheduleTask on server-side (it will update task row with event IDs when successful)
    const result = await scheduleTask(taskData, tokens.google_access_token, tokens.google_refresh_token, workingHoursStart, workingHoursEnd, timezone)

    if (!result || !result.success) {
      return NextResponse.json({ success: false, ...result }, { status: 400 })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[Calendar Schedule API] Exception:', err)
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 })
  }
}
