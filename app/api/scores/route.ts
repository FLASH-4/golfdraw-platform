import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: add a new score (enforces rolling 5-limit + no duplicate dates)
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { score, score_date } = await req.json()
  const s = Number(score)
  if (!s || s < 1 || s > 45) return NextResponse.json({ error: 'Score must be 1–45' }, { status: 400 })
  if (!score_date) return NextResponse.json({ error: 'Date required' }, { status: 400 })

  // Check for duplicate date
  const { data: existing } = await supabase
    .from('golf_scores')
    .select('id')
    .eq('user_id', user.id)
    .eq('score_date', score_date)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'A score for this date already exists. Edit or delete it first.' }, { status: 409 })

  const { error } = await supabase.from('golf_scores').insert({ user_id: user.id, score: s, score_date })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enforce 5-score rolling window — delete oldest beyond 5
  await supabase.rpc('enforce_score_limit', { p_user_id: user.id })

  return NextResponse.json({ ok: true })
}

// PATCH: edit an existing score value
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, score } = await req.json()
  const s = Number(score)
  if (!s || s < 1 || s > 45) return NextResponse.json({ error: 'Score must be 1–45' }, { status: 400 })

  const { error } = await supabase
    .from('golf_scores')
    .update({ score: s })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: remove a score
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabase.from('golf_scores').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
