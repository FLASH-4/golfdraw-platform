import Navbar from '@/components/shared/navbar'

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '120px 40px 80px' }}>
        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em', marginBottom: '16px' }}>LEGAL</div>
        <h1 className="font-display" style={{ fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 0.95, marginBottom: '24px' }}>TERMS OF SERVICE</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--gray-5)', lineHeight: 1.75, fontSize: '15px' }}>
          <p>GolfDraw is a subscription-based golf score and prize draw platform. By using the service, you agree to provide accurate account information and keep your subscription active where required.</p>
          <p>You are responsible for the scores you submit and for keeping your account secure. Prize eligibility depends on your active subscription and compliance with the rules shown in the app.</p>
          <p>We may suspend or terminate access for abuse, fraud, or policy violations. Prize payouts may require identity and proof verification.</p>
          <p>These terms may be updated as the service evolves. Continued use after changes means you accept the revised terms.</p>
        </div>
      </main>
    </>
  )
}
