import Link from 'next/link'
import Navbar from '@/components/shared/navbar'

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '120px 40px 80px' }}>
        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em', marginBottom: '16px' }}>SUPPORT</div>
        <h1 className="font-display" style={{ fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 0.95, marginBottom: '24px' }}>CONTACT US</h1>
        <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div className="card">
            <h2 className="font-display" style={{ fontSize: '24px', marginBottom: '8px' }}>Email</h2>
            <p style={{ color: 'var(--gray-5)', lineHeight: 1.7, marginBottom: '12px' }}>For support, account, or payout questions.</p>
            <a href="mailto:support@golfdraw.app" style={{ color: 'var(--lime)', textDecoration: 'none' }}>support@golfdraw.app</a>
          </div>
          <div className="card">
            <h2 className="font-display" style={{ fontSize: '24px', marginBottom: '8px' }}>General help</h2>
            <p style={{ color: 'var(--gray-5)', lineHeight: 1.7, marginBottom: '12px' }}>Use the dashboard for winner proof uploads and subscription management.</p>
            <Link href="/dashboard" style={{ color: 'var(--lime)', textDecoration: 'none' }}>Go to dashboard →</Link>
          </div>
        </div>
      </main>
    </>
  )
}
