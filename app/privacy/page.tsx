import Navbar from '@/components/shared/navbar'

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '120px 40px 80px' }}>
        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em', marginBottom: '16px' }}>LEGAL</div>
        <h1 className="font-display" style={{ fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 0.95, marginBottom: '24px' }}>PRIVACY POLICY</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--gray-5)', lineHeight: 1.75, fontSize: '15px' }}>
          <p>GolfDraw collects account details, subscription data, golf scores, charity preferences, and payment metadata to operate the service.</p>
          <p>We use this information to manage your account, process subscriptions, run prize draws, verify winners, support charity allocations, and send service emails.</p>
          <p>We do not sell your personal data. Some information is shared with Supabase, Stripe, and Resend only to provide the platform functionality.</p>
          <p>You can request account deletion or data changes by contacting support. Data retention may apply for legal, tax, and fraud-prevention purposes.</p>
        </div>
      </main>
    </>
  )
}
