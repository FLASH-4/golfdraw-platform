'use client'
import Link from 'next/link'
import Navbar from '@/components/shared/navbar'
import { useEffect, useState } from 'react'

export default function PricingPage() {
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verified = params.get('verified') === 'true'
    const plan = params.get('plan') || 'monthly'
    if (!verified) return

    setChecking(true)
    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, countryCode: 'GB' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.url) {
          window.location.href = d.url
        } else {
          setChecking(false)
          setError(d.error || 'Checkout failed. Pick a plan below.')
        }
      })
      .catch(() => {
        setChecking(false)
        setError('Checkout failed. Pick a plan below.')
      })
  }, [])

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '100vh', padding: '60px 20px', background: 'var(--black)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {checking && (
            <div style={{ textAlign: 'center', padding: '60px', marginBottom: '40px' }}>
              <div className="font-display" style={{ fontSize: '32px', color: 'var(--lime)', marginBottom: '12px' }}>✓ EMAIL VERIFIED</div>
              <p style={{ color: 'var(--gray-5)' }}>Taking you to payment...</p>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', padding: '16px', marginBottom: '32px', color: '#f87171', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {!checking && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                <h1 className="font-display" style={{ fontSize: '56px', marginBottom: '16px' }}>
                  Simple, transparent <span style={{ color: 'var(--lime)' }}>pricing</span>
                </h1>
                <p style={{ fontSize: '18px', color: 'var(--gray-5)', marginBottom: '32px' }}>
                  Pick a plan and start winning. Support your favourite charity every month.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px', marginBottom: '60px' }}>
                <div className="card" style={{ padding: '40px', border: '1px solid var(--gray-3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 className="font-display" style={{ fontSize: '24px', marginBottom: '8px' }}>Monthly</h3>
                    <p style={{ color: 'var(--gray-5)', fontSize: '14px', marginBottom: '24px' }}>Perfect for casual players</p>
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--lime)' }}>£10</span>
                      </div>
                      <p style={{ color: 'var(--gray-5)', fontSize: '14px' }}>per month, cancel anytime</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                      {['Enter 5 latest golf scores', 'Automatic entry in monthly draws', 'Support your chosen charity', 'Win cash prizes & rollover jackpots'].map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--lime)' }}>✓</span><span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link href="/signup?plan=monthly" className="btn-lime" style={{ textAlign: 'center', padding: '12px 24px', display: 'block', textDecoration: 'none' }}>
                    Get Started
                  </Link>
                </div>

                <div className="card" style={{ padding: '40px', border: '2px solid var(--lime)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-12px', left: '20px', background: 'var(--lime)', color: 'var(--black)', padding: '4px 12px', borderRadius: '2px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                    BEST VALUE
                  </div>
                  <div>
                    <h3 className="font-display" style={{ fontSize: '24px', marginBottom: '8px' }}>Yearly</h3>
                    <p style={{ color: 'var(--gray-5)', fontSize: '14px', marginBottom: '24px' }}>For serious players</p>
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--lime)' }}>£100</span>
                      </div>
                      <p style={{ color: 'var(--gray-5)', fontSize: '14px' }}>per year (save £20)</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                      {['Enter 5 latest golf scores', 'Automatic entry in all 12 draws', 'Support your chosen charity', 'Win cash prizes & rollover jackpots'].map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--lime)' }}>✓</span><span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link href="/signup?plan=yearly" className="btn-lime" style={{ textAlign: 'center', padding: '12px 24px', display: 'block', textDecoration: 'none' }}>
                    Get Started
                  </Link>
                </div>
              </div>

              <div style={{ maxWidth: '600px', margin: '0 auto', marginTop: '80px', borderTop: '1px solid var(--gray-3)', paddingTop: '60px' }}>
                <h2 className="font-display" style={{ fontSize: '32px', marginBottom: '40px', textAlign: 'center' }}>FAQs</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {[
                    { q: 'Can I change my plan?', a: 'Yes, you can upgrade from monthly to yearly at any time. Downgrading will be available after your current period ends.' },
                    { q: 'What if I cancel?', a: "You'll have access until the end of your billing period. No refunds, but no further charges either." },
                    { q: 'How is my charity allocated?', a: '10-50% of your subscription goes to your chosen charity each month. You select the percentage during signup.' },
                    { q: 'Are there taxes?', a: 'Prices shown are before VAT. VAT will be added at checkout based on your location.' },
                  ].map(({ q, a }) => (
                    <div key={q}>
                      <h4 className="font-display" style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--lime)' }}>{q}</h4>
                      <p style={{ color: 'var(--gray-5)', fontSize: '14px' }}>{a}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '60px', paddingTop: '60px', borderTop: '1px solid var(--gray-3)' }}>
                <p style={{ color: 'var(--gray-5)', marginBottom: '16px' }}>Questions? Contact support</p>
                <Link href="/" className="btn-ghost" style={{ display: 'inline-block' }}>← Back home</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}