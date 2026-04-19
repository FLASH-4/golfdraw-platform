'use client'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="top-nav" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: '1px solid var(--gray-3)',
      background: 'rgba(8,8,8,0.85)',
      backdropFilter: 'blur(12px)',
      padding: '0 40px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '64px',
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span className="font-display" style={{ fontSize: '24px', color: 'var(--lime)' }}>GOLF</span>
        <span className="font-display" style={{ fontSize: '24px', color: 'var(--white)' }}>DRAW</span>
      </Link>
      <div className="top-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link href="/" style={{ color: 'var(--gray-6)', textDecoration: 'none', fontSize: '14px' }}>Home</Link>
        <Link href="/charities" style={{ color: 'var(--gray-6)', textDecoration: 'none', fontSize: '14px' }}>Charities</Link>
        <Link href="/donate" style={{ color: 'var(--gray-6)', textDecoration: 'none', fontSize: '14px' }}>Donate</Link>
        <Link href="/how-it-works" style={{ color: 'var(--gray-6)', textDecoration: 'none', fontSize: '14px' }}>How it works</Link>
        <Link href="/login" style={{ color: 'var(--gray-6)', textDecoration: 'none', fontSize: '14px' }}>Sign in</Link>
        <Link href="/signup" className="btn-lime" style={{ padding: '9px 22px', fontSize: '14px' }}>Get started</Link>
      </div>
    </nav>
  )
}