import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateWinningNumbers, countMatches, calculatePools } from '@/lib/draw-engine'
import { sendEmail } from '@/lib/email'

// POST: run the full draw — simulate or publish
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, draw_type, winning_numbers: providedNumbers, jackpot_carryover = 0 } = await req.json()

  if (action === 'simulate') {
    // Build score frequency map for weighted draw
    let scoreFrequency: Record<number, number> | undefined
    if (draw_type === 'weighted') {
      const { data: allScores } = await supabase.from('golf_scores').select('score')
      if (allScores) {
        scoreFrequency = {}
        for (const row of allScores) {
          scoreFrequency[row.score] = (scoreFrequency[row.score] || 0) + 1
        }
      }
    }
    const numbers = generateWinningNumbers(draw_type, scoreFrequency)
    return NextResponse.json({ winning_numbers: numbers })
  }

  if (action === 'publish') {
    if (!providedNumbers || providedNumbers.length !== 5) {
      return NextResponse.json({ error: 'Must simulate first' }, { status: 400 })
    }

    // Get all active subscribers
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('user_id, plan')
      .eq('status', 'active')

    if (!activeSubs || activeSubs.length === 0) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 })
    }

    const subscriberCount = activeSubs.length
    const totalRevenue = activeSubs.reduce((sum, sub) => sum + (sub.plan === 'yearly' ? 100 / 12 : 10), 0)
    const pools = calculatePools(totalRevenue, jackpot_carryover)

    // Create the draw record
    const { data: draw, error: drawError } = await supabase
      .from('draws')
      .insert({
        draw_date: new Date().toISOString().split('T')[0],
        draw_type,
        status: 'published',
        winning_numbers: providedNumbers,
        jackpot_amount: pools.jackpot,
        jackpot_carryover,
        pool_4match: pools.fourMatch,
        pool_3match: pools.threeMatch,
        total_revenue: totalRevenue,
        subscriber_count: subscriberCount,
      })
      .select()
      .single()

    if (drawError || !draw) return NextResponse.json({ error: drawError?.message }, { status: 500 })

    // Process each subscriber's scores
    const fiveMatchWinners: string[] = []
    const fourMatchWinners: string[] = []
    const threeMatchWinners: string[] = []

    for (const sub of activeSubs) {
      const { data: scores } = await supabase
        .from('golf_scores')
        .select('score')
        .eq('user_id', sub.user_id)
        .order('score_date', { ascending: false })
        .limit(5)

      const userScores = (scores || []).map((s: { score: number }) => s.score)
      if (userScores.length === 0) continue

      const matches = countMatches(userScores, providedNumbers)
      let prize_tier: string | null = null

      if (matches >= 5) { prize_tier = '5match'; fiveMatchWinners.push(sub.user_id) }
      else if (matches === 4) { prize_tier = '4match'; fourMatchWinners.push(sub.user_id) }
      else if (matches === 3) { prize_tier = '3match'; threeMatchWinners.push(sub.user_id) }

      await supabase.from('draw_entries').insert({
        draw_id: draw.id,
        user_id: sub.user_id,
        scores: userScores,
        matches,
        prize_tier,
        prize_amount: 0, // updated below after splitting
      })
    }

    // Calculate split prize amounts and create winner records
    const jackpotRollover = fiveMatchWinners.length === 0

    const winnerInserts: object[] = []
    const entryUpdates: { user_id: string; prize_amount: number; prize_tier: string }[] = []

    if (fiveMatchWinners.length > 0) {
      const share = pools.jackpot / fiveMatchWinners.length
      for (const uid of fiveMatchWinners) {
        winnerInserts.push({ draw_id: draw.id, user_id: uid, prize_tier: '5match', prize_amount: share, status: 'pending' })
        entryUpdates.push({ user_id: uid, prize_amount: share, prize_tier: '5match' })
      }
    }
    if (fourMatchWinners.length > 0) {
      const share = pools.fourMatch / fourMatchWinners.length
      for (const uid of fourMatchWinners) {
        winnerInserts.push({ draw_id: draw.id, user_id: uid, prize_tier: '4match', prize_amount: share, status: 'pending' })
        entryUpdates.push({ user_id: uid, prize_amount: share, prize_tier: '4match' })
      }
    }
    if (threeMatchWinners.length > 0) {
      const share = pools.threeMatch / threeMatchWinners.length
      for (const uid of threeMatchWinners) {
        winnerInserts.push({ draw_id: draw.id, user_id: uid, prize_tier: '3match', prize_amount: share, status: 'pending' })
        entryUpdates.push({ user_id: uid, prize_amount: share, prize_tier: '3match' })
      }
    }

    if (winnerInserts.length > 0) await supabase.from('winners').insert(winnerInserts)

    // Notify winners by email
    if (winnerInserts.length > 0) {
      const winnerIds = Array.from(new Set(entryUpdates.map(u => u.user_id)))
      const { data: winnerProfiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', winnerIds)

      for (const w of entryUpdates) {
        const profile = winnerProfiles?.find(p => p.id === w.user_id)
        if (!profile?.email) continue
        await sendEmail({
          to: profile.email,
          subject: 'GolfDraw winner notification',
          html: `<p>Hi ${profile.full_name || 'there'},</p><p>You won the ${w.prize_tier} tier in the latest draw.</p><p>Prize amount: £${w.prize_amount.toFixed(2)}</p><p>Please upload your proof in your dashboard so the admin team can verify and pay out.</p>`,
        })
      }
    }

    // Update prize amounts in draw_entries
    for (const u of entryUpdates) {
      await supabase.from('draw_entries')
        .update({ prize_amount: u.prize_amount })
        .eq('draw_id', draw.id)
        .eq('user_id', u.user_id)
    }

    // If jackpot rolls, update draw record
    if (jackpotRollover) {
      await supabase.from('draws').update({ jackpot_carryover: pools.jackpot }).eq('id', draw.id)
    }

    return NextResponse.json({
      ok: true,
      draw_id: draw.id,
      winners: winnerInserts.length,
      jackpot_rollover: jackpotRollover,
      five_match: fiveMatchWinners.length,
      four_match: fourMatchWinners.length,
      three_match: threeMatchWinners.length,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
