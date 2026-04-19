import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: user's own winner records
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('winners')
    .select('*, draws(draw_date, winning_numbers)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

// PATCH: user uploads proof
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, proof_url } = await req.json()
  const { error } = await supabase
    .from('winners')
    .update({ proof_url })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
