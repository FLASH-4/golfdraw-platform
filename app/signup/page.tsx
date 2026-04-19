'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Charity = { id: string; name: string }

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [charityId, setCharityId] = useState('')
  const [charityPct, setCharityPct] = useState(10)
  const [charities, setCharities] = useState<Charity[]>([])
  const [charityOpen, setCharityOpen] = useState(false)
  const [charityError, setCharityError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const charityMenuRef = useRef<HTMLDivElement | null>(null)
  // Ref so the auth listener always has the latest plan value without re-subscribing
  const planRef = useRef(plan)
  useEffect(() => { planRef.current = plan }, [plan])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const getRedirectBase = () => {
    const normalized = appUrl.trim().toLowerCase()
    const isLocalhostConfig = normalized.includes('localhost') || normalized.includes('127.0.0.1')
    return normalized && !isLocalhostConfig ? appUrl : window.location.origin
  }

  useEffect(() => {
    fetch('/api/charities')
      .then(res => res.json())
      .then(data => setCharities(Array.isArray(data) ? data : []))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedPlan = params.get('plan')
    if (requestedPlan === 'yearly' || requestedPlan === 'monthly') {
      setPlan(requestedPlan)
    }
  }, [])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!charityMenuRef.current) return
      if (!charityMenuRef.current.contains(event.target as Node)) {
        setCharityOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // awaitingVerification is set to true only after user submits the signup form
  const awaitingVerification = useRef(false)

  // Poll for session every 3 seconds while waiting for email verification.
  // This catches the case where the callback route set the session via cookies
  // (server-side) which doesn't broadcast to the client localStorage channel.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const supabase = createClient()

    // Also listen for client-side auth events (same-tab or localStorage broadcast)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!awaitingVerification.current) return
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.email_confirmed_at) {
        await goToCheckout()
      }
    })

    async function goToCheckout() {
      if (!awaitingVerification.current) return
      awaitingVerification.current = false // prevent double trigger
      if (interval) clearInterval(interval)
      setVerifying(true)
      setNotice('Email verified! Taking you to payment...')
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planRef.current, countryCode: 'GB' }),
        })
        const d = await res.json()
        if (d.url) {
          window.location.href = d.url
          return
        }
      } catch {
        // fall through
      }
      window.location.href = `/pricing?verified=true&plan=${planRef.current}`
    }

    async function pollSession() {
      if (!awaitingVerification.current) return
      // getUser() hits the server directly — works even when verified on another device
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        await goToCheckout()
      }
    }

    // Start polling only when awaiting verification
    const startPolling = () => {
      if (interval) return
      interval = setInterval(pollSession, 3000)
    }

    // Expose startPolling so handleSignup can trigger it
    ;(window as any).__startVerificationPolling = startPolling

    return () => {
      subscription.unsubscribe()
      if (interval) clearInterval(interval)
      delete (window as any).__startVerificationPolling
    }
  }, [])

  async function startCheckout() {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, countryCode: 'GB' }),
    })
    const d = await res.json()
    if (!res.ok) {
      setError(d.error || 'Checkout failed. Please try again.')
      setLoading(false)
      return
    }
    if (d.url) {
      window.location.href = d.url
      return
    }
    setError('Checkout failed. Please try again.')
    setLoading(false)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!charityId) {
      setStep(2)
      setCharityError('Please select a charity before continuing.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    setNotice('')
    setResendMessage('')
    const supabase = createClient()

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getRedirectBase()}/auth/callback?next=/pricing?verified=true%26plan=${plan}`,
        data: { full_name: name },
      },
    })

    if (signupError) {
      const message = signupError.message.toLowerCase()
      const dbError = message.includes('database error saving new user')
      const rateLimit = message.includes('email rate limit exceeded')
      const alreadyRegistered = message.includes('already registered') || message.includes('user already exists')

      if (alreadyRegistered) {
        const { error: signInExistingError } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInExistingError) { await startCheckout(); return }
        const signInMessage = signInExistingError.message.toLowerCase()
        if (signInMessage.includes('email not confirmed')) {
          setError('This account exists but email is not confirmed. Verify email first, then sign in and continue to checkout.')
        } else {
          setError(signInExistingError.message)
        }
        setLoading(false)
        return
      }

      if (rateLimit) {
        const { error: signInFallbackError } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInFallbackError) { await startCheckout(); return }
        const isLocalDev = process.env.NODE_ENV !== 'production' && window.location.hostname === 'localhost'
        if (isLocalDev) {
          const devBypass = await fetch('/api/auth/dev-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: name }),
          })
          if (devBypass.ok) {
            const { error: signInAfterBypassError } = await supabase.auth.signInWithPassword({ email, password })
            if (!signInAfterBypassError) { await startCheckout(); return }
          }
        }
      }

      setError(
        dbError
          ? 'Signup failed due to auth database trigger configuration. Please run the latest Supabase SQL setup and try again.'
          : rateLimit
            ? 'Too many signup emails were sent. Please try again later, or sign in if this account already exists.'
            : signupError.message
      )
      setLoading(false)
      return
    }

    const userIdentities = Array.isArray(data.user?.identities) ? data.user.identities : []
    const likelyExistingUser = userIdentities.length === 0

    if (!data.session) {
      if (likelyExistingUser) {
        const { error: signInExistingError } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInExistingError) { await startCheckout(); return }
        const signInMessage = signInExistingError.message.toLowerCase()
        if (signInMessage.includes('email not confirmed')) {
          setError('This account exists but email is not confirmed. Verify email first, then continue.')
        } else {
          setError(signInExistingError.message)
        }
        setLoading(false)
        return
      }

      // New user awaiting email confirmation.
      // Set flag and start polling — catches both localStorage broadcast
      // and server-side cookie session set by /auth/callback route.
      awaitingVerification.current = true
      setNotice('Check your email and click the verification link. This page will automatically continue to payment once verified.')
      setLoading(false)
      // Start the 3-second session poll
      if (typeof window !== 'undefined' && (window as any).__startVerificationPolling) {
        ;(window as any).__startVerificationPolling()
      }
      return
    }

    await startCheckout()
  }

  async function handleResendVerification() {
    if (!email) { setError('Enter your email first, then request a verification resend.'); return }
    setResendLoading(true)
    setError('')
    setResendMessage('')
    const supabase = createClient()
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${getRedirectBase()}/auth/callback?next=/pricing?verified=true%26plan=${plan}`,
      },
    })
    if (resendError) { setError(resendError.message); setResendLoading(false); return }
    setResendMessage('Verification email sent. Check inbox and spam/junk folders.')
    setResendLoading(false)
  }

  const steps = ['Plan', 'Charity', 'Account']

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <Link href="/" className="btn-ghost" style={{ marginBottom: '24px', display: 'block', width: 'fit-content' }}>
          ← Home
        </Link>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '32px' }}>
          <span className="font-display" style={{ fontSize: '28px' }}>
            <span style={{ color: 'var(--lime)' }}>GOLF</span><span style={{ color: 'var(--white)' }}>DRAW</span>
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i + 1 <= step ? 'var(--lime)' : 'var(--gray-3)', transition: 'background 0.3s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '40px' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, fontSize: '11px', color: i + 1 <= step ? 'var(--lime)' : 'var(--gray-5)', letterSpacing: '0.08em' }}>{s.toUpperCase()}</div>
          ))}
        </div>

        {verifying && (
          <div style={{ background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.3)', borderRadius: '2px', padding: '16px', fontSize: '14px', color: 'var(--lime)', textAlign: 'center', marginBottom: '24px' }}>
            ✓ Email verified — redirecting to payment...
          </div>
        )}

        {step === 1 && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>CHOOSE PLAN</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '32px' }}>Pick how you want to subscribe.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {[
                { id: 'monthly', label: 'Monthly', price: '£10/month', desc: 'Flexible. Cancel anytime.' },
                { id: 'yearly', label: 'Yearly', price: '£100/year', desc: 'Save £20 — two months free.' },
              ].map(p => (
                <div key={p.id} onClick={() => setPlan(p.id as 'monthly' | 'yearly')} style={{ border: `1px solid ${plan === p.id ? 'var(--lime)' : 'var(--gray-3)'}`, padding: '20px 24px', borderRadius: '2px', cursor: 'pointer', background: plan === p.id ? 'rgba(200,241,53,0.04)' : 'var(--gray-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{p.label}</div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-5)' }}>{p.desc}</div>
                  </div>
                  <div className="font-display" style={{ fontSize: '24px', color: plan === p.id ? 'var(--lime)' : 'var(--white)' }}>{p.price}</div>
                </div>
              ))}
            </div>
            <button className="btn-lime" style={{ width: '100%', textAlign: 'center' }} onClick={() => setStep(2)}>Continue →</button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>YOUR CHARITY</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '32px' }}>Who do you want to support? You can change this anytime.</p>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>SELECT CHARITY</label>
              <div className={`charity-dropdown ${charityOpen ? 'open' : ''}`} ref={charityMenuRef}>
                <button type="button" className="charity-dropdown-trigger" onClick={() => setCharityOpen(v => !v)} aria-expanded={charityOpen}>
                  <span>{charities.find(c => c.id === charityId)?.name || '— Select a charity —'}</span>
                  <span className="charity-dropdown-arrow" aria-hidden="true">▾</span>
                </button>
                <div className="charity-dropdown-menu">
                  {charities.length === 0 && <div className="charity-dropdown-empty">No charities available</div>}
                  {charities.map(c => (
                    <button key={c.id} type="button" className={`charity-dropdown-item ${charityId === c.id ? 'selected' : ''}`} onClick={() => { setCharityId(c.id); setCharityError(''); setCharityOpen(false) }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {charityError && <p style={{ color: '#f87171', marginTop: '8px', fontSize: '13px' }}>{charityError}</p>}
            </div>
            <div style={{ marginBottom: '32px' }}>
              <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>
                CONTRIBUTION: <span style={{ color: 'var(--lime)' }}>{charityPct}%</span> of subscription
              </label>
              <input type="range" min={10} max={50} value={charityPct} onChange={e => setCharityPct(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--lime)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--gray-5)', marginTop: '6px' }}>
                <span>10% min</span><span>50% max</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--gray-5)', marginTop: '10px' }}>
                ≈ <span style={{ color: 'var(--lime)' }}>£{((plan === 'yearly' ? 100 / 12 : 10) * charityPct / 100).toFixed(2)}</span>/month to charity
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="btn-lime" style={{ flex: 2 }} onClick={() => {
                if (!charityId) { setCharityError('Please select a charity before continuing.'); return }
                setCharityError('')
                setStep(3)
              }}>Continue →</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>CREATE ACCOUNT</h1>
            <p style={{ color: 'var(--gray-5)', marginBottom: '32px' }}>{plan === 'monthly' ? '£10/month' : '£100/year'} · {charityPct}% to charity</p>
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>FULL NAME</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>EMAIL</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} required style={{ paddingRight: '92px' }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--gray-5)', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>
              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '12px 16px', fontSize: '14px', color: '#f87171' }}>{error}</div>}
              {notice && (
                <div style={{ background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.3)', borderRadius: '2px', padding: '12px 16px', fontSize: '14px', color: 'var(--lime)' }}>
                  {notice}
                </div>
              )}
              {notice && !verifying && (
                <button type="button" className="btn-ghost" onClick={handleResendVerification} disabled={resendLoading} style={{ width: '100%', opacity: resendLoading ? 0.7 : 1 }}>
                  {resendLoading ? 'Sending verification...' : 'Resend verification email'}
                </button>
              )}
              {resendMessage && (
                <div style={{ background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.3)', borderRadius: '2px', padding: '12px 16px', fontSize: '14px', color: 'var(--lime)' }}>
                  {resendMessage}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
                <button type="submit" className="btn-lime" disabled={loading || verifying} style={{ flex: 2, opacity: (loading || verifying) ? 0.7 : 1 }}>
                  {loading ? 'Creating...' : verifying ? 'Redirecting...' : 'Create & Pay'}
                </button>
              </div>
            </form>
          </>
        )}

        <div className="divider" />
        <p style={{ color: 'var(--gray-5)', fontSize: '14px', textAlign: 'center' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--lime)', textDecoration: 'none' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}