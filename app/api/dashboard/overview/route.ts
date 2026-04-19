import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let admin: ReturnType<typeof createAdminClient> | null = null
    try {
      admin = createAdminClient()
    } catch {
      admin = null
    }

    const db = admin ?? supabase

    const [
      profRes,
      subRes,
      scoresRes,
      charitiesRes,
      entriesRes,
      winnersRes,
    ] = await Promise.all([
      db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      db.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      db.from('golf_scores').select('*').eq('user_id', user.id).order('score_date', { ascending: false }),
      db.from('charities').select('id, name').eq('is_active', true).order('name'),
      db.from('draw_entries').select('*, draws(draw_date, status, winning_numbers)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      db.from('winners').select('*, draws(draw_date)').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      profile: profRes.data || null,
      subscription: subRes.data || null,
      scores: scoresRes.data || [],
      charities: charitiesRes.data || [],
      entries: entriesRes.data || [],
      winners: winnersRes.data || [],
      warning: [profRes, subRes, scoresRes, charitiesRes, entriesRes, winnersRes]
        .map(r => r.error?.message)
        .filter(Boolean)
        .join(' | ') || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected dashboard load error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
