import Link from 'next/link'
import Navbar from '@/components/shared/navbar'

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* HERO */}
      <section className="home-hero" style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '120px 40px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(var(--gray-3) 1px, transparent 1px), linear-gradient(90deg, var(--gray-3) 1px, transparent 1px)',
          backgroundSize: '80px 80px', opacity: 0.2,
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(200,241,53,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: '900px' }}>
          <div className="font-mono animate-fade-up animate-delay-1" style={{
            fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ width: '32px', height: '1px', background: 'var(--lime)', display: 'inline-block' }} />
            Charity first · Monthly draws · Real prizes
          </div>

          <h1 className="font-display animate-fade-up animate-delay-2" style={{ fontSize: 'clamp(72px, 12vw, 160px)', lineHeight: 0.9, color: 'var(--white)', marginBottom: '8px' }}>PLAY</h1>
          <h1 className="font-display animate-fade-up animate-delay-3" style={{ fontSize: 'clamp(72px, 12vw, 160px)', lineHeight: 0.9, color: 'var(--lime)', marginBottom: '8px' }}>GIVE</h1>
          <h1 className="font-display animate-fade-up animate-delay-4" style={{ fontSize: 'clamp(72px, 12vw, 160px)', lineHeight: 0.9, color: 'var(--white)', marginBottom: '48px' }}>WIN</h1>

          <p className="animate-fade-up animate-delay-4" style={{
            fontSize: '18px', color: 'var(--gray-6)', fontWeight: 300,
            maxWidth: '520px', lineHeight: 1.7, marginBottom: '48px',
          }}>
            Turn your Stableford scores into monthly chances to win while helping a charity you care about every single month.
          </p>

          <div className="animate-fade-up animate-delay-5" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn-lime" style={{ fontSize: '16px', padding: '16px 40px' }}>Start for £10/month</Link>
            <Link href="/how-it-works" className="btn-ghost" style={{ fontSize: '16px', padding: '16px 40px' }}>How it works</Link>
          </div>

          <div className="animate-fade-up animate-delay-5" style={{ marginTop: '36px', maxWidth: '620px', borderLeft: '2px solid var(--lime)', paddingLeft: '20px' }}>
            <p style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--gray-6)' }}>
              Your subscription supports a real prize pool and sends a portion to the charity you choose. Win if your scores match the draw, or make a difference even when they do not.
            </p>
          </div>
        </div>

        <div className="animate-fade-up animate-delay-5 home-hero-metrics" style={{ position: 'absolute', bottom: '60px', right: '40px', display: 'flex', gap: '48px' }}>
          {[['40%', 'Jackpot pool'], ['35%', '4-match prize'], ['10%+', 'To charity']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'right' }}>
              <div className="font-display" style={{ fontSize: '40px', color: 'var(--lime)', lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-5)', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TICKER */}
      <div style={{ borderTop: '1px solid var(--gray-3)', borderBottom: '1px solid var(--gray-3)', padding: '14px 0', overflow: 'hidden' }}>
        <div className="ticker-wrap">
          <div className="ticker-track">
            {Array(10).fill(null).map((_, i) => (
              <span key={`a-${i}`} className="font-display ticker-item" style={{ fontSize: '15px', color: 'var(--gray-5)', letterSpacing: '0.1em' }}>
                <span>MONTHLY DRAWS ·</span>
                <span>CHARITY IMPACT ·</span>
                <span>STABLEFORD SCORES ·</span>
                <span>REAL PRIZES · JACKPOT ROLLOVER ·</span>
              </span>
            ))}
            {Array(10).fill(null).map((_, i) => (
              <span key={`b-${i}`} className="font-display ticker-item" style={{ fontSize: '15px', color: 'var(--gray-5)', letterSpacing: '0.1em' }}>
                <span>MONTHLY DRAWS ·</span>
                <span>CHARITY IMPACT ·</span>
                <span>STABLEFORD SCORES ·</span>
                <span>REAL PRIZES · JACKPOT ROLLOVER ·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section style={{ padding: '120px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '80px' }}>
          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em', marginBottom: '16px' }}>HOW IT WORKS</div>
          <h2 className="font-display" style={{ fontSize: 'clamp(40px, 6vw, 80px)', lineHeight: 1 }}>THREE SIMPLE<br />STEPS</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px' }}>
          {[
            { num: '01', title: 'Subscribe', desc: 'Choose monthly (£10) or yearly (£100). A portion goes into the prize pool and your chosen charity.' },
            { num: '02', title: 'Enter Scores', desc: 'Log your last 5 Stableford scores (1–45). Your scores become your draw numbers. One per date, rolling.' },
            { num: '03', title: 'Win & Give', desc: 'Monthly draw runs. Match 3, 4, or 5 numbers to win. Jackpot rolls over if unclaimed. Charity gets paid.' },
          ].map(step => (
            <div key={step.num} className="hover-card" style={{
              background: 'var(--gray-1)', border: '1px solid var(--gray-3)',
              padding: '48px 36px', position: 'relative', transition: 'border-color 0.2s',
            }}>
              <div className="font-display" style={{ fontSize: '80px', color: 'var(--gray-3)', lineHeight: 1, marginBottom: '24px' }}>{step.num}</div>
              <h3 className="font-display" style={{ fontSize: '32px', marginBottom: '16px' }}>{step.title.toUpperCase()}</h3>
              <p style={{ color: 'var(--gray-5)', lineHeight: 1.7, fontSize: '15px' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRIZE BREAKDOWN */}
      <section style={{ padding: '80px 40px', background: 'var(--gray-1)', borderTop: '1px solid var(--gray-3)', borderBottom: '1px solid var(--gray-3)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ marginBottom: '60px' }}>
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em', marginBottom: '16px' }}>IMPACT STRUCTURE</div>
            <h2 className="font-display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>WHAT YOUR<br />SUBSCRIPTION DOES</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { pct: '40%', label: '5-Number Match', sub: 'Jackpot — rolls over if unclaimed', color: 'var(--lime)' },
              { pct: '35%', label: '4-Number Match', sub: 'Split equally among winners', color: 'var(--white)' },
              { pct: '25%', label: '3-Number Match', sub: 'Split equally among winners', color: 'var(--gray-6)' },
              { pct: '10%+', label: 'Charity', sub: 'Your chosen cause, every month', color: '#4ade80' },
            ].map(item => (
              <div key={item.label} style={{ border: '1px solid var(--gray-3)', padding: '32px 24px', borderRadius: '2px' }}>
                <div className="font-display" style={{ fontSize: '56px', color: item.color, lineHeight: 1, marginBottom: '12px' }}>{item.pct}</div>
                <div style={{ fontWeight: 500, marginBottom: '6px', fontSize: '15px' }}>{item.label}</div>
                <div style={{ color: 'var(--gray-5)', fontSize: '13px' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '120px 40px', textAlign: 'center', borderTop: '1px solid var(--gray-3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(200,241,53,0.06) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em', marginBottom: '24px' }}>JOIN TODAY</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 100px)', marginBottom: '24px', lineHeight: 0.95 }}>
          YOUR SCORES<br />COULD WIN<br /><span style={{ color: 'var(--lime)' }}>EVERYTHING</span>
        </h2>
        <p style={{ color: 'var(--gray-5)', marginBottom: '48px', fontSize: '16px' }}>Monthly draws. Real prizes. Real impact.</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn-lime" style={{ fontSize: '17px', padding: '18px 48px' }}>Subscribe — £10/month</Link>
          <Link href="/signup?plan=yearly" className="btn-ghost" style={{ fontSize: '17px', padding: '18px 48px' }}>Go yearly — £100/year</Link>
          <Link href="/donate" className="btn-ghost" style={{ fontSize: '17px', padding: '18px 48px' }}>Donate separately</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--gray-3)', padding: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <span className="font-display" style={{ fontSize: '20px', color: 'var(--gray-5)' }}><span style={{ color: 'var(--lime)' }}>GOLF</span>DRAW</span>
        <span style={{ color: 'var(--gray-5)', fontSize: '13px' }}>© 2026 GolfDraw. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
            { label: 'Contact', href: '/contact' },
          ].map(link => (
            <Link key={link.label} href={link.href} style={{ color: 'var(--gray-5)', fontSize: '13px', textDecoration: 'none' }}>{link.label}</Link>
          ))}
        </div>
      </footer>
    </>
  )
}