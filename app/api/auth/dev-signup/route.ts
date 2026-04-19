import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { email, password, full_name } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
      },
    })

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('already') || message.includes('registered')) {
        return NextResponse.json({ ok: true, existed: true })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, existed: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected dev-signup error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
