import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/shared/navbar'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function CharityProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: charity } = await supabase
    .from('charities')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!charity) notFound()

  // Get subscriber count for this charity
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('charity_id', id)

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '100vh', background: 'var(--black)', paddingTop: '80px' }}>

        {/* Hero */}
        <div style={{ position: 'relative', minHeight: '420px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
          {charity.image_url ? (
            <>
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${charity.image_url})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'brightness(0.3)',
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, var(--black) 0%, transparent 60%)',
              }} />
            </>
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(var(--gray-3) 1px, transparent 1px), linear-gradient(90deg, var(--gray-3) 1px, transparent 1px)',
                backgroundSize: '60px 60px', opacity: 0.15,
              }} />
              <div style={{
                position: 'absolute', top: '20%', left: '10%',
                width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(200,241,53,0.06) 0%, transparent 70%)',
                borderRadius: '50%',
              }} />
            </div>
          )}

          <div style={{ position: 'relative', padding: '60px 40px 48px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
            <Link href="/charities" style={{ color: 'var(--gray-5)', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
              ← All charities
            </Link>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {charity.is_featured && (
                <span style={{ background: 'var(--lime)', color: 'var(--black)', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '2px', letterSpacing: '0.1em' }}>
                  FEATURED
                </span>
              )}
            </div>
            <h1 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.95, marginBottom: '16px', color: 'var(--white)' }}>
              {charity.name.toUpperCase()}
            </h1>
            {count !== null && count > 0 && (
              <p style={{ color: 'var(--lime)', fontSize: '14px', fontFamily: 'DM Mono, monospace' }}>
                {count} subscriber{count !== 1 ? 's' : ''} supporting this cause
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 40px 100px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '48px', alignItems: 'start' }}>

            {/* Left — main content */}
            <div>
              {charity.description && (
                <div style={{ marginBottom: '48px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.15em', marginBottom: '16px', fontFamily: 'DM Mono, monospace' }}>ABOUT</div>
                  <p style={{ fontSize: '17px', color: 'var(--gray-6)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                    {charity.description}
                  </p>
                </div>
              )}

              {charity.upcoming_events && (
                <div style={{ marginBottom: '48px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.15em', marginBottom: '16px', fontFamily: 'DM Mono, monospace' }}>UPCOMING EVENTS</div>
                  <div style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '4px', padding: '24px' }}>
                    <p style={{ color: 'var(--gray-6)', fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                      {charity.upcoming_events}
                    </p>
                  </div>
                </div>
              )}

              {/* How support works */}
              <div>
                <div style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.15em', marginBottom: '16px', fontFamily: 'DM Mono, monospace' }}>HOW YOUR SUPPORT WORKS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { num: '01', text: 'Subscribe to GolfDraw — monthly or yearly' },
                    { num: '02', text: 'Choose this charity at signup or update anytime in your dashboard' },
                    { num: '03', text: 'A minimum of 10% of your subscription goes directly to this cause every month' },
                    { num: '04', text: 'Enter draws, win prizes, and give back — all at the same time' },
                  ].map(item => (
                    <div key={item.num} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px', background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '2px' }}>
                      <span className="font-display" style={{ color: 'var(--lime)', fontSize: '20px', lineHeight: 1, minWidth: '28px' }}>{item.num}</span>
                      <span style={{ color: 'var(--gray-6)', fontSize: '14px', lineHeight: 1.6 }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* CTA card */}
              <div style={{ background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '4px', padding: '28px' }}>
                <div className="font-display" style={{ fontSize: '28px', marginBottom: '8px' }}>SUPPORT THIS CAUSE</div>
                <p style={{ color: 'var(--gray-5)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
                  Subscribe to GolfDraw and select this charity. A portion of your subscription goes here every month.
                </p>
                <Link href={`/signup`} className="btn-lime" style={{ display: 'block', textAlign: 'center', marginBottom: '10px', textDecoration: 'none' }}>
                  Subscribe — £10/month
                </Link>
                <Link href="/donate" className="btn-ghost" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', fontSize: '14px', padding: '10px' }}>
                  One-time donation →
                </Link>
              </div>

              {/* Stats card */}
              <div style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '4px', padding: '24px' }}>
                <div style={{ fontSize: '11px', color: 'var(--gray-5)', letterSpacing: '0.1em', marginBottom: '16px' }}>CONTRIBUTION BREAKDOWN</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Monthly subscriber share', value: '10–50%' },
                    { label: 'Min. monthly contribution', value: '£1.00' },
                    { label: 'Payment cadence', value: 'Monthly' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--gray-5)' }}>{row.label}</span>
                      <span style={{ color: 'var(--white)', fontFamily: 'DM Mono, monospace' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Website link */}
              {charity.website && (
                <a
                  href={charity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '4px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'var(--lime)', fontSize: '14px', transition: 'border-color 0.2s' }}
                >
                  <span>Visit official website</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
