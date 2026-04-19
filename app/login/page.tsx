'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

    if (profile?.role === 'admin') {
    router.push('/admin')
    } else {
    router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Link href="/" className="btn-ghost" style={{ marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          ← Home
        </Link>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div className="font-display" style={{ fontSize: '28px', marginBottom: '48px' }}>
            <span style={{ color: 'var(--lime)' }}>GOLF</span><span style={{ color: 'var(--white)' }}>DRAW</span>
          </div>
        </Link>
        <h1 className="font-display" style={{ fontSize: '48px', marginBottom: '8px' }}>SIGN IN</h1>
        <p style={{ color: 'var(--gray-5)', marginBottom: '40px' }}>Welcome back. Your draw awaits.</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>EMAIL</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--gray-5)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ paddingRight: '92px' }} />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--gray-5)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  letterSpacing: '0.04em',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '12px 16px', fontSize: '14px', color: '#f87171' }}>{error}</div>}
          <button type="submit" className="btn-lime" disabled={loading} style={{ marginTop: '8px', width: '100%', textAlign: 'center', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="divider" />
        <p style={{ color: 'var(--gray-5)', fontSize: '14px', textAlign: 'center' }}>
          No account? <Link href="/signup" style={{ color: 'var(--lime)', textDecoration: 'none' }}>Get started →</Link>
        </p>
      </div>
    </div>
  )
}