import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'recovery' | null
  const next = searchParams.get('next') ?? '/pricing'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  // Handle PKCE flow (code param) — used when emailRedirectTo is set in signUp()
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectUrl = new URL(next, appUrl)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Handle token_hash flow — used by Supabase default email templates
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      const redirectUrl = new URL(next, appUrl)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Both failed — send to login with error
  return NextResponse.redirect(new URL('/login?error=verification_failed', appUrl))
}