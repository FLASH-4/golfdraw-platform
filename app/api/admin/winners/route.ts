import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabase
    .from('winners')
    .select('*, profiles(full_name, email), draws(draw_date, winning_numbers)')
    .order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status, admin_note } = await req.json()
  const { data: winner } = await supabase
    .from('winners')
    .select('id, user_id, status, proof_url, prize_amount, prize_tier')
    .eq('id', id)
    .maybeSingle()

  if (!winner) return NextResponse.json({ error: 'Winner not found' }, { status: 404 })

  // Prevent payout before verification and proof submission
  if (status === 'paid' && (!winner.proof_url || (winner.status !== 'verified' && winner.status !== 'paid'))) {
    return NextResponse.json({ error: 'Winner must be verified with proof before marking as paid' }, { status: 400 })
  }

  const noteWithReference = status === 'paid' && !admin_note
    ? `Payout processed ${new Date().toISOString()} | ref:PAYOUT-${Date.now()}`
    : admin_note

  const { error } = await supabase.from('winners').update({ status, admin_note: noteWithReference }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: winnerProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', winner.user_id)
    .maybeSingle()

  if (winnerProfile?.email) {
    const body = status === 'verified'
      ? `<p>Hi ${winnerProfile.full_name || 'there'},</p><p>Your winner proof has been verified for tier ${winner.prize_tier} (£${Number(winner.prize_amount || 0).toFixed(2)}).</p><p>Payment is being prepared.</p>`
      : status === 'paid'
        ? `<p>Hi ${winnerProfile.full_name || 'there'},</p><p>Your prize payment for tier ${winner.prize_tier} (£${Number(winner.prize_amount || 0).toFixed(2)}) has been marked as paid.</p><p>${noteWithReference || ''}</p>`
        : `<p>Hi ${winnerProfile.full_name || 'there'},</p><p>Your winner submission was updated to status: ${status}.</p>${noteWithReference ? `<p>Note: ${noteWithReference}</p>` : ''}`

    await sendEmail({
      to: winnerProfile.email,
      subject: `GolfDraw winner status: ${status}`,
      html: body,
    })
  }

  return NextResponse.json({ ok: true })
}
