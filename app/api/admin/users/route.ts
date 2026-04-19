import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabase
    .from('profiles')
    .select('*, subscriptions(id, plan, status, current_period_end), golf_scores(id, score, score_date)')
    .order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type, ...body } = await req.json()

  if (type === 'score') {
    const { id, score } = body
    const { error } = await supabase.from('golf_scores').update({ score }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (type === 'subscription') {
    const { sub_id, status } = body
    const { error } = await supabase.from('subscriptions').update({ status }).eq('id', sub_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (type === 'role') {
    const { user_id, role } = body
    if (!user_id || !['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role payload' }, { status: 400 })
    }

    if (role === 'user') {
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
      const isTargetAdmin = (admins || []).some(a => a.id === user_id)
      if (isTargetAdmin && (admins || []).length <= 1) {
        return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 400 })
      }
    }

    const { error } = await supabase.from('profiles').update({ role }).eq('id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('role_audit_log').insert({
      actor_id: user.id,
      target_user_id: user_id,
      action: role === 'admin' ? 'promote_admin' : 'demote_admin',
      note: 'Updated from admin panel',
    })
  }

  return NextResponse.json({ ok: true })
}
