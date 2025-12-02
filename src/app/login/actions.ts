'use server'

// Actions for login and signup
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  let supabase
  try {
    supabase = createClient()
  } catch (error: any) {
    console.error("Failed to create Supabase client:", error)
    const errorMsg = error?.message || 'Unknown error'
    // Check which variables are missing
    const missingUrl = !process.env.NEXT_PUBLIC_SUPABASE_URL
    const missingKey = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    let userMsg = 'Configuration error: '
    if (missingUrl) userMsg += 'NEXT_PUBLIC_SUPABASE_URL is missing. '
    if (missingKey) userMsg += 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. '
    if (!missingUrl && !missingKey) userMsg += errorMsg
    redirect('/login?message=' + encodeURIComponent(userMsg))
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?message=' + encodeURIComponent('Email and password are required'))
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Login error:", error.message, error)
      redirect('/login?message=' + encodeURIComponent('Login failed: ' + error.message))
    }

    if (!data.session) {
      console.error("Login error: No session created")
      redirect('/login?message=' + encodeURIComponent('Login failed: No session created. Please check your email for confirmation link.'))
    }

    revalidatePath('/', 'layout')
    redirect('/')
  } catch (error: any) {
    // Next.js redirect() throws NEXT_REDIRECT error - this is expected, don't catch it
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-throw redirect errors
    }
    console.error("Login exception:", error)
    const errorMsg = error?.message || 'Unknown error'
    redirect('/login?message=' + encodeURIComponent('Login error: ' + errorMsg))
  }
}

export async function signup(formData: FormData) {
  let supabase
  try {
    supabase = createClient()
  } catch (error: any) {
    console.error("Failed to create Supabase client:", error)
    const errorMsg = error?.message || 'Unknown error'
    // Check which variables are missing
    const missingUrl = !process.env.NEXT_PUBLIC_SUPABASE_URL
    const missingKey = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    let userMsg = 'Configuration error: '
    if (missingUrl) userMsg += 'NEXT_PUBLIC_SUPABASE_URL is missing. '
    if (missingKey) userMsg += 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. '
    if (!missingUrl && !missingKey) userMsg += errorMsg
    redirect('/login?message=' + encodeURIComponent(userMsg))
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?message=' + encodeURIComponent('Email and password are required'))
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error("Signup error:", error.message, error)
      redirect('/login?message=' + encodeURIComponent('Could not create user: ' + error.message))
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      // Email confirmation required - user needs to check their email
      redirect('/login?message=' + encodeURIComponent('Please check your email to confirm your account'))
    }

    // User is signed in (email confirmation disabled or auto-confirmed)
    if (data.session) {
      revalidatePath('/', 'layout')
      redirect('/')
    }

    // Fallback: redirect to login
    redirect('/login?message=' + encodeURIComponent('Signup successful. Please check your email to confirm your account.'))
  } catch (error: any) {
    // Next.js redirect() throws NEXT_REDIRECT error - this is expected, don't catch it
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-throw redirect errors
    }
    console.error("Signup exception:", error)
    const errorMsg = error?.message || 'Unknown error'
    redirect('/login?message=' + encodeURIComponent('Signup error: ' + errorMsg))
  }
}

export async function loginWithGoogle() {
  let supabase
  try {
    supabase = createClient()
  } catch (error: any) {
    console.error("Failed to create Supabase client:", error)
    const errorMsg = error?.message || 'Unknown error'
    // Check which variables are missing
    const missingUrl = !process.env.NEXT_PUBLIC_SUPABASE_URL
    const missingKey = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    let userMsg = 'Configuration error: '
    if (missingUrl) userMsg += 'NEXT_PUBLIC_SUPABASE_URL is missing. '
    if (missingKey) userMsg += 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. '
    if (!missingUrl && !missingKey) userMsg += errorMsg
    redirect('/login?message=' + encodeURIComponent(userMsg))
  }
  
  try {
    // Construct redirect URL - Supabase will use this after OAuth
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      : 'http://localhost:3000/auth/callback'
    
    console.log('Initiating Google OAuth with redirect URL:', redirectUrl)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (error) {
      console.error("Google login error:", error.message, error)
      redirect('/login?message=' + encodeURIComponent('Google login failed: ' + error.message))
    }

    if (data?.url) {
      console.log('Redirecting to Google OAuth URL')
      redirect(data.url)
    } else {
      console.error('No OAuth URL received from Supabase')
      redirect('/login?message=' + encodeURIComponent('Google login failed: OAuth not configured. Please check Supabase Google provider settings.'))
    }
  } catch (error: any) {
    // Next.js redirect() throws NEXT_REDIRECT error - this is expected, don't catch it
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-throw redirect errors
    }
    console.error("Google login exception:", error)
    const errorMsg = error?.message || 'Unknown error'
    redirect('/login?message=' + encodeURIComponent('Google login error: ' + errorMsg))
  }
}
