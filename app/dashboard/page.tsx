'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Score = { id: string; score: number; score_date: string }
type Profile = { full_name: string; email: string; charity_percentage: number; charity_id: string | null; role: string }
type Subscription = { plan: string; status: string; current_period_end: string }
type Charity = { id: string; name: string }
type DrawEntry = { id: string; scores: number[]; matches: number; prize_tier: string | null; prize_amount: number; draws: { draw_date: string; status: string; winning_numbers: number[] } }
type Winner = { id: string; prize_tier: string; prize_amount: number; status: string; proof_url: string | null; draws: { draw_date: string } }

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [charities, setCharities] = useState<Charity[]>([])
  const [entries, setEntries] = useState<DrawEntry[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'scores' | 'draws' | 'charity' | 'winnings'>('overview')
  const [newScore, setNewScore] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [scoreError, setScoreError] = useState('')
  const [scoreLoading, setScoreLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [charityId, setCharityId] = useState('')
  const [charityPct, setCharityPct] = useState(10)
  const [charityLoading, setCharityLoading] = useState(false)
  const [proofUploading, setProofUploading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const subscribed = params.get('subscribed') === 'true'
    const sessionId = params.get('session_id')
    if (!subscribed || !sessionId) return

    // Small delay to let the Stripe webhook write first; then sync as fallback
    const timer = setTimeout(() => syncSubscription(sessionId), 1500)
    return () => clearTimeout(timer)
  }, [])

  async function syncSubscription(sessionId: string) {
    try {
      const res = await fetch('/api/subscriptions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      // Whether or not sync succeeded, reload — webhook may have already written the data
      await loadAll()
      if (!res.ok) {
        // Retry once after 3 more seconds in case webhook was slow
        setTimeout(loadAll, 3000)
      }
    } catch {
      // Network error — still try to reload in case webhook wrote data
      await loadAll()
    }
  }

  async function loadAll() {
    const res = await fetch('/api/dashboard/overview', { cache: 'no-store' })
    const data = await res.json()
    if (res.status === 401) { router.push('/login'); return }
    if (!res.ok) return

    setProfile(data.profile || null)
    setSubscription(data.subscription || null)
    setScores(data.scores || [])
    setCharities(data.charities || [])
    setEntries(data.entries || [])
    setWinners(data.winners || [])
    setCharityId(data.profile?.charity_id || '')
    setCharityPct(data.profile?.charity_percentage || 10)
  }

  async function addScore(e: React.FormEvent) {
    e.preventDefault()
    setScoreError('')
    setScoreLoading(true)
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: Number(newScore), score_date: newDate }),
    })
    const data = await res.json()
    if (!res.ok) { setScoreError(data.error); setScoreLoading(false); return }
    setNewScore('')
    await loadAll()
    setScoreLoading(false)
  }

  async function deleteScore(id: string) {
    await fetch(`/api/scores?id=${id}`, { method: 'DELETE' })
    await loadAll()
  }

  async function saveEdit(id: string) {
    const res = await fetch('/api/scores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, score: Number(editVal) }),
    })
    if (res.ok) { setEditingId(null); await loadAll() }
  }

  async function saveCharity() {
    setCharityLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ charity_id: charityId || null, charity_percentage: charityPct }).eq('id', user.id)
    await loadAll()
    setCharityLoading(false)
  }

  async function uploadProof(winnerId: string, file: File) {
    setProofUploading(winnerId)
    if (!file.type.startsWith('image/')) {
      setProofUploading(null)
      return
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const path = `${user.id}/${winnerId}-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('winner-proofs').upload(path, file)
    if (error) { setProofUploading(null); return }
    const { data: urlData } = supabase.storage.from('winner-proofs').getPublicUrl(path)
    await fetch('/api/winners', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: winnerId, proof_url: urlData.publicUrl }),
    })
    await loadAll()
    setProofUploading(null)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const totalWon = winners.reduce((sum, w) => sum + (w.prize_amount || 0), 0)
  const pendingWinners = winners.filter(w => w.status === 'pending' && !w.proof_url)
  const paidWinners = winners.filter(w => w.status === 'paid')
  const verifiedWinners = winners.filter(w => w.status === 'verified')
  const rejectedWinners = winners.filter(w => w.status === 'rejected')
  const paidOutTotal = paidWinners.reduce((sum, w) => sum + (w.prize_amount || 0), 0)
  const nextDrawDate = (() => {
    const date = new Date()
    date.setMonth(date.getMonth() + 1)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  })()

  const tabs = [
    { id: 'overview', label: '▪ Overview' },
    { id: 'scores', label: '▪ Scores' },
    { id: 'draws', label: '▪ Draw History' },
    { id: 'charity', label: '▪ Charity' },
    { id: 'winnings', label: `▪ Winnings${pendingWinners.length > 0 ? ` (${pendingWinners.length})` : ''}` },
  ] as const

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex' }}>
      {/* Sidebar */}
      <div className="app-sidebar" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px', background: 'var(--gray-1)', borderRight: '1px solid var(--gray-3)', display: 'flex', flexDirection: 'column', padding: '32px 0', zIndex: 50 }}>
        <div style={{ padding: '0 24px', marginBottom: '48px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="font-display" style={{ fontSize: '22px' }}>
              <span style={{ color: 'var(--lime)' }}>GOLF</span><span style={{ color: 'var(--white)' }}>DRAW</span>
            </span>
          </Link>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? 'rgba(200,241,53,0.08)' : 'transparent', border: 'none', borderRadius: '2px', color: activeTab === tab.id ? 'var(--lime)' : 'var(--gray-5)', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', borderLeft: activeTab === tab.id ? '2px solid var(--lime)' : '2px solid transparent' }}>
              {tab.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '0 12px' }}>
          <div style={{ padding: '16px 12px', borderTop: '1px solid var(--gray-3)', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--white)', fontWeight: 500, marginBottom: '2px' }}>{profile?.full_name || '—'}</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-5)' }}>{profile?.email}</div>
            <div style={{ marginTop: '8px' }}>
              <span className={`pill ${subscription?.status === 'active' ? 'pill-active' : 'pill-inactive'}`}>
                {subscription ? `${subscription.plan} · active` : 'no subscription'}
              </span>
            </div>
          </div>
          {profile?.role === 'admin' && (
            <Link href="/admin" style={{ display: 'block', color: 'var(--lime)', fontSize: '13px', padding: '8px 12px', textDecoration: 'none', marginBottom: '4px' }}>
                ← Admin panel
            </Link>
        )}
        <button onClick={signOut} style={{ background: 'transparent', border: 'none', color: 'var(--gray-5)', fontSize: '13px', cursor: 'pointer', padding: '8px 12px', width: '100%', textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }}>Sign out →</button>
        </div>
      </div>

      {/* Main */}
      <div className="app-main" style={{ marginLeft: '240px', padding: '48px', flex: 1, minWidth: 0 }}>

        {/* No subscription banner */}
        {!subscription && (
          <div style={{ background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '4px', padding: '16px 24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>You don't have an active subscription</div>
              <div style={{ fontSize: '13px', color: 'var(--gray-5)' }}>Subscribe to enter monthly draws and support your charity.</div>
            </div>
            <Link href="/signup" className="btn-lime" style={{ padding: '10px 24px', fontSize: '14px' }}>Subscribe now</Link>
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>
              WELCOME BACK{profile?.full_name ? `, ${profile.full_name.split(' ')[0].toUpperCase()}` : ''}
            </h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '40px' }}>Your platform overview.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
              {[
                { label: 'Plan', value: subscription ? (subscription.plan === 'yearly' ? 'Yearly' : 'Monthly') : '—', sub: subscription?.status || 'inactive' },
                { label: 'Scores', value: `${scores.length}/5`, sub: 'rolling window' },
                { label: 'Charity share', value: `${profile?.charity_percentage || 10}%`, sub: 'of subscription' },
                { label: 'Total won', value: `£${totalWon.toFixed(2)}`, sub: `${winners.length} prize(s)` },
                { label: 'Renewal', value: subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—', sub: 'next billing' },
              ].map(card => (
                <div key={card.label} className="card">
                  <div style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', marginBottom: '12px' }}>{card.label.toUpperCase()}</div>
                  <div className="font-display" style={{ fontSize: '32px', color: 'var(--lime)', lineHeight: 1, marginBottom: '6px' }}>{card.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-5)' }}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', marginBottom: '14px' }}>PARTICIPATION SUMMARY</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-5)', marginBottom: '6px' }}>Draws entered</div>
                  <div className="font-display" style={{ fontSize: '30px', color: 'var(--lime)' }}>{entries.length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-5)' }}>Your recorded draw history</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-5)', marginBottom: '6px' }}>Upcoming draw</div>
                  <div className="font-display" style={{ fontSize: '30px', color: 'var(--lime)' }}>{nextDrawDate}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-5)' }}>Next scheduled monthly draw</div>
                </div>
              </div>
            </div>

            {pendingWinners.length > 0 && (
              <div style={{ background: 'rgba(200,241,53,0.06)', border: '1px solid var(--lime)', borderRadius: '4px', padding: '20px 24px', marginBottom: '24px' }}>
                <div className="font-display" style={{ fontSize: '20px', color: 'var(--lime)', marginBottom: '8px' }}>🏆 YOU WON A PRIZE!</div>
                <p style={{ color: 'var(--gray-6)', fontSize: '14px', marginBottom: '12px' }}>Upload your score proof to claim your prize. Go to the Winnings tab.</p>
                <button className="btn-lime" style={{ padding: '10px 24px', fontSize: '14px' }} onClick={() => setActiveTab('winnings')}>Upload proof →</button>
              </div>
            )}

            {/* Quick score entry */}
            <div className="card">
              <h3 className="font-display" style={{ fontSize: '22px', marginBottom: '20px' }}>QUICK SCORE ENTRY</h3>
              {!subscription ? (
                <p style={{ color: 'var(--gray-5)', fontSize: '14px' }}>Subscribe to log scores.</p>
              ) : (
                <form onSubmit={addScore} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input className="input" type="number" min={1} max={45} value={newScore} onChange={e => setNewScore(e.target.value)} placeholder="Score (1–45)" style={{ flex: '0 0 150px' }} required />
                  <input className="input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: '0 0 170px' }} required />
                  <button type="submit" className="btn-lime" style={{ padding: '12px 28px' }} disabled={scoreLoading}>{scoreLoading ? '...' : 'Add score'}</button>
                </form>
              )}
              {scoreError && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '8px' }}>{scoreError}</p>}
            </div>
          </>
        )}

        {/* SCORES */}
        {activeTab === 'scores' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>YOUR SCORES</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '32px' }}>Last 5 Stableford scores (1–45). One per date. Oldest auto-removed when 6th is added.</p>

            {subscription && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <form onSubmit={addScore} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input className="input" type="number" min={1} max={45} value={newScore} onChange={e => setNewScore(e.target.value)} placeholder="Score (1–45)" style={{ flex: '0 0 150px' }} required />
                  <input className="input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: '0 0 170px' }} required />
                  <button type="submit" className="btn-lime" style={{ padding: '12px 28px' }} disabled={scoreLoading}>{scoreLoading ? 'Adding...' : 'Add score'}</button>
                </form>
                {scoreError && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '8px' }}>{scoreError}</p>}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scores.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-5)' }}>
                  <div className="font-display" style={{ fontSize: '40px', color: 'var(--gray-3)', marginBottom: '12px' }}>NO SCORES YET</div>
                  <p>Add your first Stableford score above.</p>
                </div>
              )}
              {scores.map((s, i) => (
                <div key={s.id} style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '2px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--gray-5)', fontFamily: 'DM Mono, monospace', width: '24px' }}>#{i + 1}</span>
                  {editingId === s.id ? (
                    <>
                      <input className="input" type="number" min={1} max={45} value={editVal} onChange={e => setEditVal(e.target.value)} style={{ width: '100px', padding: '6px 10px' }} />
                      <span style={{ color: 'var(--gray-5)', fontSize: '13px', flex: 1 }}>{new Date(s.score_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => saveEdit(s.id)} className="btn-lime" style={{ padding: '6px 16px', fontSize: '13px' }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: '1px solid var(--gray-3)', color: 'var(--gray-5)', padding: '6px 16px', borderRadius: '2px', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="score-badge" style={{ fontSize: '20px', padding: '8px 14px' }}>{s.score}</span>
                      <span style={{ color: 'var(--gray-5)', fontSize: '14px', flex: 1 }}>{new Date(s.score_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => { setEditingId(s.id); setEditVal(String(s.score)) }} style={{ background: 'transparent', border: '1px solid var(--gray-3)', color: 'var(--gray-5)', padding: '6px 14px', borderRadius: '2px', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.color = 'var(--lime)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-3)'; e.currentTarget.style.color = 'var(--gray-5)' }}>Edit</button>
                      <button onClick={() => deleteScore(s.id)} style={{ background: 'transparent', border: '1px solid var(--gray-3)', color: 'var(--gray-5)', padding: '6px 14px', borderRadius: '2px', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-3)'; e.currentTarget.style.color = 'var(--gray-5)' }}>Remove</button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {scores.length > 0 && (
              <p style={{ color: 'var(--gray-5)', fontSize: '13px', marginTop: '16px', fontFamily: 'DM Mono, monospace' }}>
                Average: {(scores.reduce((a, s) => a + s.score, 0) / scores.length).toFixed(1)} · These are your draw numbers
              </p>
            )}
          </>
        )}

        {/* DRAW HISTORY */}
        {activeTab === 'draws' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>DRAW HISTORY</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '32px' }}>Your participation in monthly draws.</p>
            {entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', border: '1px solid var(--gray-3)', borderRadius: '2px', color: 'var(--gray-5)' }}>
                <div className="font-display" style={{ fontSize: '40px', color: 'var(--gray-3)', marginBottom: '12px' }}>NO DRAWS YET</div>
                <p>You'll appear here once a draw has been published.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entries.map(e => {
                  const tierColor = e.prize_tier === '5match' ? 'var(--lime)' : e.prize_tier === '4match' ? '#60a5fa' : e.prize_tier === '3match' ? '#fb923c' : 'var(--gray-5)'
                  return (
                    <div key={e.id} style={{ background: 'var(--gray-1)', border: `1px solid ${e.prize_amount > 0 ? 'var(--lime)' : 'var(--gray-3)'}`, borderRadius: '2px', padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--gray-5)', fontFamily: 'DM Mono, monospace', marginBottom: '8px' }}>{e.draws?.draw_date}</div>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            {(e.scores || []).map((s, i) => (
                              <span key={i} className="score-badge" style={{ fontSize: '16px', padding: '6px 10px' }}>{s}</span>
                            ))}
                          </div>
                          {e.draws?.status === 'published' && (
                            <div style={{ fontSize: '12px', color: 'var(--gray-5)', marginTop: '4px' }}>
                              Winning: {(e.draws.winning_numbers || []).join(', ')} · <span style={{ color: tierColor, fontWeight: 500 }}>{e.matches} match{e.matches !== 1 ? 'es' : ''}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {e.prize_amount > 0 ? (
                            <>
                              <div className="font-display" style={{ fontSize: '28px', color: 'var(--lime)' }}>£{e.prize_amount.toFixed(2)}</div>
                              <span className="pill pill-active">{e.prize_tier}</span>
                            </>
                          ) : (
                            <span className="pill pill-inactive">No match</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* CHARITY */}
        {activeTab === 'charity' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>CHARITY</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '40px' }}>Choose who receives a portion of your subscription.</p>
            <div className="card" style={{ maxWidth: '560px' }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>SELECT CHARITY</label>
                <select className="input" value={charityId} onChange={e => setCharityId(e.target.value)}>
                  <option value="">— None selected —</option>
                  {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '32px' }}>
                <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>
                  CONTRIBUTION: <span style={{ color: 'var(--lime)' }}>{charityPct}%</span> of your subscription
                </label>
                <input type="range" min={10} max={50} value={charityPct} onChange={e => setCharityPct(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--lime)', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--gray-5)', marginTop: '6px' }}>
                  <span>10% (min)</span><span>50% (max)</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--gray-5)', marginTop: '12px' }}>
                  That's approximately <span style={{ color: 'var(--lime)' }}>£{((subscription?.plan === 'yearly' ? 100 / 12 : 10) * charityPct / 100).toFixed(2)}</span>/month to your chosen charity.
                </p>
              </div>
              <button className="btn-lime" style={{ width: '100%' }} onClick={saveCharity} disabled={charityLoading}>
                {charityLoading ? 'Saving...' : 'Save charity settings'}
              </button>
            </div>
          </>
        )}

        {/* WINNINGS */}
        {activeTab === 'winnings' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>WINNINGS</h1>
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', marginBottom: '14px' }}>WINNINGS OVERVIEW</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-5)', marginBottom: '6px' }}>Total won</div>
                  <div className="font-display" style={{ fontSize: '32px', color: 'var(--lime)' }}>£{totalWon.toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-5)' }}>{winners.length} prize{winners.length === 1 ? '' : 's'} recorded</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-5)', marginBottom: '6px' }}>Current payment status</div>
                  <div className="font-display" style={{ fontSize: '32px', color: pendingWinners.length > 0 ? 'var(--lime)' : paidWinners.length > 0 ? 'var(--white)' : 'var(--gray-5)' }}>
                    {pendingWinners.length > 0 ? 'Pending proof' : verifiedWinners.length > 0 ? 'Under review' : paidWinners.length > 0 ? 'Paid out' : 'No winnings'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-5)' }}>
                    {pendingWinners.length > 0
                      ? `${pendingWinners.length} awaiting screenshot upload`
                      : verifiedWinners.length > 0
                        ? `${verifiedWinners.length} awaiting payout`
                        : paidWinners.length > 0
                          ? `${paidWinners.length} marked as paid`
                          : 'Nothing to claim yet'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-5)', marginBottom: '6px' }}>Paid out</div>
                  <div className="font-display" style={{ fontSize: '32px', color: 'var(--lime)' }}>£{paidOutTotal.toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-5)' }}>{paidWinners.length} completed payout{paidWinners.length === 1 ? '' : 's'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-5)', marginBottom: '6px' }}>Review queue</div>
                  <div className="font-display" style={{ fontSize: '32px', color: 'var(--lime)' }}>{verifiedWinners.length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-5)' }}>{rejectedWinners.length} rejected, {pendingWinners.length} waiting on proof</div>
                </div>
              </div>
            </div>

            {winners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', border: '1px solid var(--gray-3)', borderRadius: '2px', color: 'var(--gray-5)' }}>
                <div className="font-display" style={{ fontSize: '40px', color: 'var(--gray-3)', marginBottom: '12px' }}>NO WINNINGS YET</div>
                <p>Keep entering scores. Your turn is coming.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {winners.map(w => (
                  <div key={w.id} style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '2px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-5)', fontFamily: 'DM Mono, monospace', marginBottom: '6px' }}>{w.draws?.draw_date}</div>
                        <div className="font-display" style={{ fontSize: '32px', color: 'var(--lime)' }}>£{w.prize_amount.toFixed(2)}</div>
                        <div style={{ fontSize: '13px', color: 'var(--gray-5)', marginTop: '4px' }}>{w.prize_tier} prize</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span className={`pill ${w.status === 'paid' ? 'pill-active' : w.status === 'verified' ? 'pill-pending' : w.status === 'rejected' ? 'pill-inactive' : 'pill-pending'}`}>
                          {w.status}
                        </span>
                        {w.status === 'pending' && !w.proof_url && (
                          <div>
                            <p style={{ fontSize: '12px', color: 'var(--gray-5)', marginBottom: '8px' }}>Upload a screenshot of your golf platform scores to claim</p>
                            <label style={{ cursor: 'pointer' }}>
                              <span className="btn-lime" style={{ padding: '8px 18px', fontSize: '13px' }}>
                                {proofUploading === w.id ? 'Uploading...' : 'Upload screenshot'}
                              </span>
                              <input type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={async e => { if (e.target.files?.[0]) await uploadProof(w.id, e.target.files[0]) }} />
                            </label>
                          </div>
                        )}
                        {w.proof_url && w.status === 'pending' && (
                          <div style={{ fontSize: '12px', color: 'var(--lime)' }}>✓ Proof submitted — awaiting admin review</div>
                        )}
                        {w.status === 'rejected' && (
                          <div style={{ fontSize: '12px', color: '#f87171' }}>Rejected — contact support</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
