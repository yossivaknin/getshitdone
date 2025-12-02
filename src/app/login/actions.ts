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
      
      // User-friendly error messages
      let userMessage = 'Login failed. '
      if (error.message.includes('Invalid login credentials')) {
        userMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (error.message.includes('Email not confirmed')) {
        userMessage = 'Please check your email and click the confirmation link before logging in.'
      } else if (error.message.includes('Too many requests')) {
        userMessage = 'Too many login attempts. Please wait a few minutes and try again.'
      } else {
        userMessage = 'Unable to sign in. ' + error.message
      }
      
      redirect('/login?message=' + encodeURIComponent(userMessage))
    }

    if (!data.session) {
      console.error("Login error: No session created")
      redirect('/login?message=' + encodeURIComponent('Please check your email and confirm your account before signing in.'))
    }

    revalidatePath('/', 'layout')
    redirect('/')
  } catch (error: any) {
    // Next.js redirect() throws NEXT_REDIRECT error - this is expected, don't catch it
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-throw redirect errors
    }
    console.error("Login exception:", error)
    redirect('/login?message=' + encodeURIComponent('An unexpected error occurred. Please try again.'))
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
      
      // User-friendly error messages
      let userMessage = 'Unable to create account. '
      if (error.message.includes('User already registered')) {
        userMessage = 'An account with this email already exists. Please sign in instead.'
      } else if (error.message.includes('Password')) {
        userMessage = 'Password does not meet requirements. Please use a stronger password.'
      } else if (error.message.includes('Email')) {
        userMessage = 'Please enter a valid email address.'
      } else {
        userMessage = 'Unable to create account. ' + error.message
      }
      
      redirect('/login?message=' + encodeURIComponent(userMessage))
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      // Email confirmation required - user needs to check their email
      redirect('/login?message=' + encodeURIComponent('Account created! Please check your email (' + email + ') and click the confirmation link to activate your account.'))
    }

    // User is signed in (email confirmation disabled or auto-confirmed)
    if (data.session) {
      revalidatePath('/', 'layout')
      redirect('/')
    }

    // Fallback: redirect to login with confirmation message
    redirect('/login?message=' + encodeURIComponent('Account created! Please check your email and click the confirmation link to activate your account.'))
  } catch (error: any) {
    // Next.js redirect() throws NEXT_REDIRECT error - this is expected, don't catch it
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-throw redirect errors
    }
    console.error("Signup exception:", error)
    redirect('/login?message=' + encodeURIComponent('An unexpected error occurred while creating your account. Please try again.'))
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
