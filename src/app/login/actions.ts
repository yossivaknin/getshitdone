'use server'

// Actions for login and signup
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  try {
    const supabase = createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      redirect('/login?message=' + encodeURIComponent('Email and password are required'))
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Login error:", error.message)
      redirect('/login?message=' + encodeURIComponent('Login failed: ' + error.message))
      return
    }

    revalidatePath('/', 'layout')
    redirect('/')
  } catch (error: any) {
    console.error("Login exception:", error)
    redirect('/login?message=' + encodeURIComponent('An error occurred during login. Please try again.'))
  }
}

export async function signup(formData: FormData) {
  try {
    const supabase = createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      redirect('/login?message=' + encodeURIComponent('Email and password are required'))
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error("Signup error:", error.message)
      redirect('/login?message=' + encodeURIComponent('Could not create user: ' + error.message))
      return
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      // Email confirmation required - user needs to check their email
      redirect('/login?message=' + encodeURIComponent('Please check your email to confirm your account'))
      return
    }

    // User is signed in (email confirmation disabled or auto-confirmed)
    if (data.session) {
      revalidatePath('/', 'layout')
      redirect('/')
      return
    }

    // Fallback: redirect to login
    redirect('/login?message=' + encodeURIComponent('Signup successful. Please check your email to confirm your account.'))
  } catch (error: any) {
    console.error("Signup exception:", error)
    redirect('/login?message=' + encodeURIComponent('An error occurred during signup. Please try again.'))
  }
}

export async function loginWithGoogle() {
  const supabase = createClient()
  
  // Construct redirect URL - Supabase will use this after OAuth
  const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    : 'http://localhost:3000/auth/callback'
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  })

  if (error) {
    console.error("Google login error:", error.message)
    redirect('/login?message=' + encodeURIComponent('Google login failed: ' + error.message))
    return
  }

  if (data?.url) {
    redirect(data.url)
  }
}
