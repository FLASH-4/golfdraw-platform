'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calculatePools } from '@/lib/draw-engine'

type User = { id: string; full_name: string; email: string; role: string; created_at: string; charity_percentage: number; subscriptions: { id: string; plan: string; status: string; current_period_end: string }[]; golf_scores: { id: string; score: number; score_date: string }[] }
type Draw = { id: string; draw_date: string; status: string; winning_numbers: number[] | null; jackpot_amount: number; pool_4match: number; pool_3match: number; draw_type: string; subscriber_count: number; total_revenue: number; jackpot_carryover: number }
type Charity = { id: string; name: string; description: string; image_url: string; website: string; is_featured: boolean; is_active: boolean }
type Winner = { id: string; prize_tier: string; prize_amount: number; status: string; proof_url: string | null; admin_note: string | null; profiles: { full_name: string; email: string }; draws: { draw_date: string; winning_numbers: number[] } }

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [draws, setDraws] = useState<Draw[]>([])
  const [charities, setCharities] = useState<Charity[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [activeTab, setActiveTab] = useState<'users' | 'draws' | 'charities' | 'winners' | 'analytics'>('users')
  const [drawMode, setDrawMode] = useState<'random' | 'weighted'>('random')
  const [simResult, setSimResult] = useState<number[] | null>(null)
  const [drawLoading, setDrawLoading] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishResult, setPublishResult] = useState<{ winners: number; five_match: number; four_match: number; three_match: number; jackpot_rollover: boolean } | null>(null)
  const [lastJackpotCarryover, setLastJackpotCarryover] = useState(0)
  const [charityForm, setCharityForm] = useState({ name: '', description: '', image_url: '', website: '', is_featured: false, is_active: true })
  const [editingCharity, setEditingCharity] = useState<string | null>(null)
  const [charityMsg, setCharityMsg] = useState('')
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null)
  const [editScoreVal, setEditScoreVal] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (prof?.role !== 'admin') { router.push('/dashboard'); return }

    const [usersRes, drawsRes, charitiesRes, winnersRes] = await Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      supabase.from('draws').select('*').order('draw_date', { ascending: false }),
      fetch('/api/admin/charity').then(r => r.json()),
      fetch('/api/admin/winners').then(r => r.json()),
    ])

    setUsers(usersRes || [])
    setDraws(drawsRes.data || [])
    setCharities(charitiesRes || [])
    setWinners(winnersRes || [])

    // Get last jackpot carryover if no 5-match winners in last draw
    const lastDraw = drawsRes.data?.[0]
    if (lastDraw?.jackpot_carryover > 0) setLastJackpotCarryover(lastDraw.jackpot_carryover)
  }

  async function simulate() {
    setDrawLoading(true)
    setPublishResult(null)
    const res = await fetch('/api/admin/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'simulate', draw_type: drawMode }),
    })
    const data = await res.json()
    setSimResult(data.winning_numbers)
    setDrawLoading(false)
  }

  async function publish() {
    if (!simResult) return
    setPublishLoading(true)
    const res = await fetch('/api/admin/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish', draw_type: drawMode, winning_numbers: simResult, jackpot_carryover: lastJackpotCarryover }),
    })
    const data = await res.json()
    if (res.ok) {
      setPublishResult(data)
      setSimResult(null)
      setLastJackpotCarryover(data.jackpot_rollover ? data.jackpot_amount : 0)
      await loadAll()
    }
    setPublishLoading(false)
  }

  async function saveCharity(e: React.FormEvent) {
    e.preventDefault()
    setCharityMsg('')
    const method = editingCharity ? 'PATCH' : 'POST'
    const body = editingCharity ? { id: editingCharity, ...charityForm } : charityForm
    const res = await fetch('/api/admin/charity', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      setCharityMsg(editingCharity ? 'Updated.' : 'Created.')
      setEditingCharity(null)
      setCharityForm({ name: '', description: '', image_url: '', website: '', is_featured: false, is_active: true })
      await loadAll()
    }
  }

  async function deleteCharity(id: string) {
    if (!confirm('Delete this charity?')) return
    await fetch(`/api/admin/charity?id=${id}`, { method: 'DELETE' })
    await loadAll()
  }

  async function updateWinner(id: string, status: string, note?: string) {
    await fetch('/api/admin/winners', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, admin_note: note }),
    })
    await loadAll()
  }

  async function saveScoreEdit(id: string) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'score', id, score: Number(editScoreVal) }),
    })
    setEditingScoreId(null)
    await loadAll()
  }

  async function updateSubStatus(subId: string, status: string) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'subscription', sub_id: subId, status }),
    })
    await loadAll()
  }

  async function updateUserRole(userId: string, role: 'user' | 'admin') {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'role', user_id: userId, role }),
    })
    await loadAll()
  }

  const activeSubs = users.filter(u => u.subscriptions?.some(s => s.status === 'active')).length
  const totalRevenue = users.reduce((sum, u) => {
    const sub = u.subscriptions?.find(s => s.status === 'active')
    if (!sub) return sum
    return sum + (sub.plan === 'yearly' ? 100 / 12 : 10)
  }, 0)
  const pools = calculatePools(totalRevenue, lastJackpotCarryover)
  const totalCharityContributions = users.reduce((sum, u) => {
    const sub = u.subscriptions?.find(s => s.status === 'active')
    if (!sub) return sum
    const amount = sub.plan === 'yearly' ? 100 / 12 : 10
    return sum + (amount * ((u.charity_percentage || 10) / 100))
  }, 0)

  const tabs = [
    { id: 'users', label: '▪ Users' },
    { id: 'draws', label: '▪ Draw Engine' },
    { id: 'charities', label: '▪ Charities' },
    { id: 'winners', label: `▪ Winners${winners.filter(w => w.status === 'pending' && w.proof_url).length > 0 ? ` (!)` : ''}` },
    { id: 'analytics', label: '▪ Analytics' },
  ] as const

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex' }}>
      {/* Sidebar */}
      <div className="app-sidebar" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px', background: 'var(--gray-1)', borderRight: '1px solid var(--gray-3)', display: 'flex', flexDirection: 'column', padding: '32px 0', zIndex: 50 }}>
        <div style={{ padding: '0 24px', marginBottom: '8px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="font-display" style={{ fontSize: '22px' }}>
              <span style={{ color: 'var(--lime)' }}>GOLF</span><span style={{ color: 'var(--white)' }}>DRAW</span>
            </span>
          </Link>
          <div style={{ fontSize: '10px', color: 'var(--gray-5)', letterSpacing: '0.15em', marginTop: '4px' }}>ADMIN PANEL</div>
        </div>
        <div style={{ height: '1px', background: 'var(--gray-3)', margin: '16px 0' }} />
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? 'rgba(200,241,53,0.08)' : 'transparent', border: 'none', borderRadius: '2px', color: activeTab === tab.id ? 'var(--lime)' : 'var(--gray-5)', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', borderLeft: activeTab === tab.id ? '2px solid var(--lime)' : '2px solid transparent' }}>
              {tab.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '0 24px', borderTop: '1px solid var(--gray-3)', paddingTop: '16px' }}>
          <Link href="/dashboard" style={{ color: 'var(--gray-5)', fontSize: '12px', textDecoration: 'none' }}>← User dashboard</Link>
        </div>
      </div>

      {/* Main */}
      <div className="app-main" style={{ marginLeft: '240px', padding: '48px', flex: 1, minWidth: 0 }}>

        {/* USERS */}
        {activeTab === 'users' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>USERS</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '32px' }}>{users.length} total · {activeSubs} active subscribers</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {users.map(u => {
                const sub = u.subscriptions?.[0]
                const isExpanded = expandedUser === u.id
                return (
                  <div key={u.id} style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '2px' }}>
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '2px' }}>{u.full_name || '—'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-5)', fontFamily: 'DM Mono, monospace' }}>{u.email}</div>
                      </div>
                      <span className={`pill ${u.role === 'admin' ? 'pill-pending' : 'pill-inactive'}`}>{u.role}</span>
                      <span className={`pill ${sub?.status === 'active' ? 'pill-active' : 'pill-inactive'}`}>{sub?.status || 'no sub'}</span>
                      <span style={{ fontSize: '12px', color: 'var(--gray-5)', fontFamily: 'DM Mono, monospace' }}>{new Date(u.created_at).toLocaleDateString('en-GB')}</span>
                      <span style={{ color: 'var(--gray-5)', fontSize: '16px' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--gray-3)', padding: '20px 20px 20px 36px' }}>
                        {/* Subscription management */}
                        {sub && (
                          <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', marginBottom: '8px' }}>SUBSCRIPTION</div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13px', color: 'var(--gray-6)' }}>{sub.plan} · renews {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-GB') : '—'}</span>
                              {['active', 'lapsed', 'cancelled'].map(s => (
                                <button key={s} onClick={() => updateSubStatus(sub.id, s)}
                                  style={{ background: sub.status === s ? 'rgba(200,241,53,0.1)' : 'transparent', border: `1px solid ${sub.status === s ? 'var(--lime)' : 'var(--gray-3)'}`, color: sub.status === s ? 'var(--lime)' : 'var(--gray-5)', padding: '4px 12px', borderRadius: '2px', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', marginBottom: '8px' }}>ROLE</div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {(['user', 'admin'] as const).map(r => (
                              <button key={r} onClick={() => updateUserRole(u.id, r)}
                                style={{ background: u.role === r ? 'rgba(200,241,53,0.1)' : 'transparent', border: `1px solid ${u.role === r ? 'var(--lime)' : 'var(--gray-3)'}`, color: u.role === r ? 'var(--lime)' : 'var(--gray-5)', padding: '4px 12px', borderRadius: '2px', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize' }}>
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Scores */}
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', marginBottom: '8px' }}>GOLF SCORES</div>
                          {(!u.golf_scores || u.golf_scores.length === 0) ? (
                            <p style={{ fontSize: '13px', color: 'var(--gray-5)' }}>No scores.</p>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {u.golf_scores.sort((a, b) => b.score_date.localeCompare(a.score_date)).map(s => (
                                <div key={s.id} style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-3)', borderRadius: '2px', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {editingScoreId === s.id ? (
                                    <>
                                      <input className="input" type="number" min={1} max={45} value={editScoreVal} onChange={e => setEditScoreVal(e.target.value)} style={{ width: '70px', padding: '4px 8px', fontSize: '13px' }} />
                                      <button onClick={() => saveScoreEdit(s.id)} style={{ background: 'var(--lime)', color: 'var(--black)', border: 'none', padding: '4px 10px', borderRadius: '2px', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>✓</button>
                                      <button onClick={() => setEditingScoreId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--gray-5)', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ color: 'var(--lime)', fontFamily: 'DM Mono, monospace', fontSize: '16px' }}>{s.score}</span>
                                      <span style={{ color: 'var(--gray-5)', fontSize: '11px' }}>{s.score_date}</span>
                                      <button onClick={() => { setEditingScoreId(s.id); setEditScoreVal(String(s.score)) }} style={{ background: 'transparent', border: 'none', color: 'var(--gray-5)', cursor: 'pointer', fontSize: '11px', fontFamily: 'DM Sans, sans-serif' }}>edit</button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* DRAW ENGINE */}
        {activeTab === 'draws' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>DRAW ENGINE</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '40px' }}>Simulate, preview, then publish. Simulation does not commit data.</p>

            <div className="card" style={{ marginBottom: '32px' }}>
              <h3 className="font-display" style={{ fontSize: '22px', marginBottom: '20px' }}>RUN DRAW</h3>

              {lastJackpotCarryover > 0 && (
                <div style={{ background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.3)', borderRadius: '2px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px' }}>
                  🏆 Jackpot carryover from last draw: <span style={{ color: 'var(--lime)', fontWeight: 500 }}>£{lastJackpotCarryover.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {(['random', 'weighted'] as const).map(m => (
                  <button key={m} onClick={() => setDrawMode(m)} style={{ background: drawMode === m ? 'rgba(200,241,53,0.1)' : 'transparent', border: `1px solid ${drawMode === m ? 'var(--lime)' : 'var(--gray-3)'}`, color: drawMode === m ? 'var(--lime)' : 'var(--gray-5)', padding: '10px 24px', borderRadius: '2px', cursor: 'pointer', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize', transition: 'all 0.2s' }}>
                    {m === 'random' ? 'Random' : 'Weighted (by score frequency)'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn-ghost" onClick={simulate} disabled={drawLoading} style={{ opacity: drawLoading ? 0.7 : 1 }}>
                  {drawLoading ? 'Simulating...' : 'Simulate draw'}
                </button>
                {simResult && (
                  <button className="btn-lime" onClick={publish} disabled={publishLoading} style={{ opacity: publishLoading ? 0.7 : 1 }}>
                    {publishLoading ? 'Publishing...' : 'Publish & process results'}
                  </button>
                )}
              </div>

              {simResult && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', marginBottom: '12px' }}>SIMULATED WINNING NUMBERS</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {simResult.map(n => <div key={n} className="score-badge" style={{ fontSize: '28px', padding: '14px 20px' }}>{n}</div>)}
                  </div>
                  <p style={{ color: 'var(--gray-5)', fontSize: '13px', marginTop: '12px' }}>Click "Publish" to process all subscriber entries against these numbers.</p>
                </div>
              )}

              {publishResult && (
                <div style={{ marginTop: '24px', background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.3)', borderRadius: '2px', padding: '20px' }}>
                  <div className="font-display" style={{ fontSize: '22px', marginBottom: '12px', color: 'var(--lime)' }}>DRAW PUBLISHED</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    {[
                      { label: 'Total winners', value: publishResult.winners },
                      { label: '5-match', value: publishResult.five_match },
                      { label: '4-match', value: publishResult.four_match },
                      { label: '3-match', value: publishResult.three_match },
                      { label: 'Jackpot rolled', value: publishResult.jackpot_rollover ? 'Yes' : 'No' },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontSize: '11px', color: 'var(--gray-5)', marginBottom: '4px' }}>{s.label.toUpperCase()}</div>
                        <div className="font-display" style={{ fontSize: '28px', color: 'var(--lime)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <h3 className="font-display" style={{ fontSize: '22px', marginBottom: '16px' }}>DRAW HISTORY</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {draws.length === 0 && <p style={{ color: 'var(--gray-5)' }}>No draws yet.</p>}
              {draws.map(d => (
                <div key={d.id} style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '2px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--gray-5)', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>{d.draw_date}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {d.winning_numbers?.map(n => <span key={n} className="score-badge" style={{ fontSize: '14px', padding: '4px 8px' }}>{n}</span>)}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--gray-5)' }}>{d.subscriber_count} subscribers · £{d.total_revenue?.toFixed(0)} revenue</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {d.jackpot_carryover > 0 && <span style={{ fontSize: '12px', color: 'var(--lime)' }}>+£{d.jackpot_carryover.toFixed(0)} carryover</span>}
                    <span className="pill pill-active">{d.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CHARITIES */}
        {activeTab === 'charities' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>CHARITIES</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '32px' }}>Manage the charity directory.</p>

            {/* Form */}
            <div className="card" style={{ marginBottom: '32px' }}>
              <h3 className="font-display" style={{ fontSize: '22px', marginBottom: '20px' }}>{editingCharity ? 'EDIT CHARITY' : 'ADD CHARITY'}</h3>
              <form onSubmit={saveCharity} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>NAME *</label>
                  <input className="input" value={charityForm.name} onChange={e => setCharityForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>DESCRIPTION</label>
                  <textarea className="input" value={charityForm.description} onChange={e => setCharityForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>IMAGE URL</label>
                  <input className="input" value={charityForm.image_url} onChange={e => setCharityForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>WEBSITE</label>
                  <input className="input" value={charityForm.website} onChange={e => setCharityForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                    <input type="checkbox" checked={charityForm.is_featured} onChange={e => setCharityForm(f => ({ ...f, is_featured: e.target.checked }))} style={{ accentColor: 'var(--lime)' }} /> Featured
                  </label>
                  <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                    <input type="checkbox" checked={charityForm.is_active} onChange={e => setCharityForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: 'var(--lime)' }} /> Active
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" className="btn-lime" style={{ padding: '12px 28px' }}>{editingCharity ? 'Update' : 'Add charity'}</button>
                  {editingCharity && (
                    <button type="button" className="btn-ghost" onClick={() => { setEditingCharity(null); setCharityForm({ name: '', description: '', image_url: '', website: '', is_featured: false, is_active: true }) }} style={{ padding: '12px 28px' }}>Cancel</button>
                  )}
                </div>
                {charityMsg && <p style={{ color: 'var(--lime)', fontSize: '13px', gridColumn: '1 / -1' }}>{charityMsg}</p>}
              </form>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {charities.map(c => (
                <div key={c.id} style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '2px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {c.name}
                      {c.is_featured && <span className="pill pill-pending">featured</span>}
                      <span className={`pill ${c.is_active ? 'pill-active' : 'pill-inactive'}`}>{c.is_active ? 'active' : 'inactive'}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-5)' }}>{c.description?.slice(0, 80)}{c.description?.length > 80 ? '...' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setEditingCharity(c.id); setCharityForm({ name: c.name, description: c.description || '', image_url: c.image_url || '', website: c.website || '', is_featured: c.is_featured, is_active: c.is_active }) }} style={{ background: 'transparent', border: '1px solid var(--gray-3)', color: 'var(--gray-5)', padding: '6px 14px', borderRadius: '2px', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>Edit</button>
                    <button onClick={() => deleteCharity(c.id)} style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', padding: '6px 14px', borderRadius: '2px', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>Delete</button>
                  </div>
                </div>
              ))}
              {charities.length === 0 && <p style={{ color: 'var(--gray-5)' }}>No charities yet. Add one above.</p>}
            </div>
          </>
        )}

        {/* WINNERS */}
        {activeTab === 'winners' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>WINNERS</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '32px' }}>Verify proof uploads and mark payouts.</p>

            {/* Filter tabs */}
            {['all', 'pending', 'verified', 'paid', 'rejected'].map(f => {
              const count = f === 'all' ? winners.length : winners.filter(w => w.status === f).length
              return null // rendered inline below
            })}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {winners.length === 0 && <p style={{ color: 'var(--gray-5)' }}>No winners yet.</p>}
              {winners.map(w => (
                <div key={w.id} style={{ background: 'var(--gray-1)', border: `1px solid ${w.status === 'pending' && w.proof_url ? 'var(--lime)' : 'var(--gray-3)'}`, borderRadius: '2px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>{w.profiles?.full_name || '—'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-5)', fontFamily: 'DM Mono, monospace', marginBottom: '4px' }}>{w.profiles?.email}</div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-5)' }}>Draw: {w.draws?.draw_date} · {w.prize_tier}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-display" style={{ fontSize: '28px', color: 'var(--lime)' }}>£{w.prize_amount.toFixed(2)}</div>
                      <span className={`pill ${w.status === 'paid' ? 'pill-active' : w.status === 'verified' ? 'pill-pending' : w.status === 'rejected' ? 'pill-inactive' : 'pill-pending'}`}>{w.status}</span>
                    </div>
                  </div>

                  {w.proof_url ? (
                    <div style={{ marginBottom: '12px' }}>
                      <a href={w.proof_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)', fontSize: '13px', textDecoration: 'none' }}>View proof screenshot →</a>
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--gray-5)', marginBottom: '12px' }}>No proof uploaded yet.</p>
                  )}

                  {w.admin_note && (
                    <p style={{ fontSize: '13px', color: 'var(--gray-5)', marginBottom: '12px', fontStyle: 'italic' }}>Note: {w.admin_note}</p>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {w.status !== 'verified' && w.status !== 'paid' && w.proof_url && (
                      <button onClick={() => updateWinner(w.id, 'verified')} style={{ background: 'rgba(200,241,53,0.1)', border: '1px solid var(--lime)', color: 'var(--lime)', padding: '6px 16px', borderRadius: '2px', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>✓ Verify</button>
                    )}
                    {w.status === 'verified' && (
                      <button onClick={() => updateWinner(w.id, 'paid')} style={{ background: 'rgba(200,241,53,0.15)', border: '1px solid var(--lime)', color: 'var(--lime)', padding: '6px 16px', borderRadius: '2px', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Mark as Paid</button>
                    )}
                    {w.status !== 'rejected' && w.status !== 'paid' && (
                      <button onClick={() => updateWinner(w.id, 'rejected', 'Proof invalid')} style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', padding: '6px 16px', borderRadius: '2px', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>✕ Reject</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '40px' }}>ANALYTICS</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
              {[
                { label: 'Total users', value: users.length },
                { label: 'Active subscribers', value: activeSubs },
                { label: 'Est. monthly revenue', value: `£${totalRevenue.toFixed(0)}` },
                { label: 'Jackpot pool', value: `£${pools.jackpot.toFixed(0)}` },
                { label: '4-match pool', value: `£${pools.fourMatch.toFixed(0)}` },
                { label: '3-match pool', value: `£${pools.threeMatch.toFixed(0)}` },
                { label: 'Total draws run', value: draws.length },
                { label: 'Total winners', value: winners.length },
                { label: 'Est. charity/month', value: `£${totalCharityContributions.toFixed(0)}` },
              ].map(stat => (
                <div key={stat.label} className="card">
                  <div style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', marginBottom: '12px' }}>{stat.label.toUpperCase()}</div>
                  <div className="font-display" style={{ fontSize: '36px', color: 'var(--lime)', lineHeight: 1 }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <h3 className="font-display" style={{ fontSize: '22px', marginBottom: '16px' }}>SUBSCRIPTION BREAKDOWN</h3>
            <div style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '4px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gray-3)' }}>
                    {['Name', 'Plan', 'Status', 'Charity %', 'Monthly contribution'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', fontWeight: 400, fontFamily: 'DM Mono, monospace' }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const sub = u.subscriptions?.find(s => s.status === 'active')
                    const monthly = sub ? (sub.plan === 'yearly' ? 100 / 12 : 10) : 0
                    const charityAmount = monthly * ((u.charity_percentage || 10) / 100)
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--gray-2)' }}>
                        <td style={{ padding: '12px 16px', fontSize: '14px' }}>{u.full_name || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--gray-5)' }}>{sub?.plan || '—'}</td>
                        <td style={{ padding: '12px 16px' }}><span className={`pill ${sub ? 'pill-active' : 'pill-inactive'}`}>{sub?.status || 'none'}</span></td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--lime)', fontFamily: 'DM Mono, monospace' }}>{u.charity_percentage || 10}%</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>{sub ? `£${charityAmount.toFixed(2)}` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
