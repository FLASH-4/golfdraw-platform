'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/shared/navbar'

type Charity = { id: string; name: string }

export default function DonatePage() {
  const [amount, setAmount] = useState('25')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [charityId, setCharityId] = useState('')
  const [charities, setCharities] = useState<Charity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/charities')
      .then(res => res.json())
      .then(data => setCharities(Array.isArray(data) ? data : []))
  }, [])

  async function handleDonate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const selectedCharity = charities.find(c => c.id === charityId)
    const res = await fetch('/api/donate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        email,
        name,
        charityId,
        charityName: selectedCharity?.name || '',
      }),
    })

    const data = await res.json()
    if (data.url) window.location.href = data.url
    else {
      setError(data.error || 'Donation checkout failed')
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '120px 40px 80px' }}>
        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em', marginBottom: '16px' }}>SUPPORT</div>
        <h1 className="font-display" style={{ fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 0.95, marginBottom: '16px' }}>MAKE A DONATION</h1>
        <p style={{ color: 'var(--gray-5)', maxWidth: '620px', marginBottom: '40px', lineHeight: 1.7 }}>
          This is a standalone donation flow. It is not tied to your score entry or prize gameplay.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <form onSubmit={handleDonate} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>DONATION AMOUNT (£)</label>
              <input className="input" type="number" min={1} step="1" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>YOUR NAME</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>EMAIL</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>OPTIONAL CHARITY</label>
              <select className="input" value={charityId} onChange={e => setCharityId(e.target.value)}>
                <option value="">No specific charity</option>
                {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '12px 16px', fontSize: '14px', color: '#f87171' }}>{error}</div>}
            <button type="submit" className="btn-lime" disabled={loading}>{loading ? 'Preparing...' : 'Donate with Stripe'}</button>
          </form>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="font-display" style={{ fontSize: '32px' }}>Why donate?</h2>
            <p style={{ color: 'var(--gray-5)', lineHeight: 1.7 }}>
              Donations are separate from subscriptions. You can support a cause once, without joining the monthly draw system.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {['One-time payment', 'Not tied to gameplay', 'Supports your chosen cause'].map(item => (
                <div key={item} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--lime)' }}>✓</span>
                  <span style={{ color: 'var(--gray-6)' }}>{item}</span>
                </div>
              ))}
            </div>
            <Link href="/charities" className="btn-ghost" style={{ marginTop: 'auto', textAlign: 'center' }}>Browse charities</Link>
          </div>
        </div>
      </main>
    </>
  )
}
