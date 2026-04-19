import Navbar from '@/components/shared/navbar'
import Link from 'next/link'

export default function HowItWorksPage() {
  const steps = [
    { num: '01', title: 'Subscribe', body: 'Choose monthly (£10) or yearly (£100). Your subscription funds the prize pool and your chosen charity. Cancel anytime.' },
    { num: '02', title: 'Log your scores', body: 'After each round, enter your Stableford score (1–45) and the date. We keep your 5 most recent. One per date only.' },
    { num: '03', title: 'Scores become numbers', body: 'Your 5 logged scores become your draw numbers for the monthly draw.' },
    { num: '04', title: 'Monthly draw runs', body: 'Admin runs the draw — random or weighted by score frequency. Five numbers are drawn.' },
    { num: '05', title: 'Match to win', body: 'Match 3 → share 25% pool. Match 4 → share 35%. Match all 5 → jackpot (40%). Jackpot rolls over if unclaimed.' },
    { num: '06', title: 'Verify & get paid', body: 'Winners upload a screenshot from their golf platform. Admin verifies and marks payout complete.' },
  ]
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: '100px' }}>
        <section style={{ padding: '80px 40px', maxWidth: '800px', margin: '0 auto' }}>
          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em', marginBottom: '16px' }}>THE PROCESS</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 1, marginBottom: '24px' }}>HOW IT<br />WORKS</h1>
          <p style={{ color: 'var(--gray-5)', fontSize: '18px', lineHeight: 1.7 }}>Golf platform meets lottery logic meets charitable giving.</p>
        </section>
        <section style={{ padding: '0 40px 120px', maxWidth: '800px', margin: '0 auto' }}>
          {steps.map((step, i) => (
            <div key={step.num} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr', gap: '24px',
              paddingBottom: '48px', marginBottom: '48px',
              borderBottom: i < steps.length - 1 ? '1px solid var(--gray-3)' : 'none',
            }}>
              <div className="font-display" style={{ fontSize: '48px', color: 'var(--lime)', lineHeight: 1 }}>{step.num}</div>
              <div>
                <h3 className="font-display" style={{ fontSize: '28px', marginBottom: '12px' }}>{step.title.toUpperCase()}</h3>
                <p style={{ color: 'var(--gray-5)', lineHeight: 1.8, fontSize: '16px' }}>{step.body}</p>
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/signup" className="btn-lime" style={{ fontSize: '17px', padding: '18px 48px' }}>Get started — £10/month</Link>
          </div>
        </section>
      </div>
    </>
  )
}