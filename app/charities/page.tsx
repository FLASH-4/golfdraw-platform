import Navbar from '@/components/shared/navbar'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CharitiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase.from('charities').select('*').eq('is_active', true).order('is_featured', { ascending: false }).order('name')
  if (q) query = query.ilike('name', `%${q}%`)
  const { data: charities } = await query

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: '100px', padding: '120px 40px 80px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '60px' }}>
          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.2em', marginBottom: '16px' }}>CHARITY DIRECTORY</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(48px, 7vw, 96px)', lineHeight: 1, marginBottom: '24px' }}>CAUSES<br />WE SUPPORT</h1>
          <p style={{ color: 'var(--gray-5)', maxWidth: '720px', lineHeight: 1.7, marginBottom: '24px' }}>
            You can support a charity through your subscription or make a separate one-time donation.
          </p>
          {/* Search */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <form method="GET" style={{ display: 'flex', gap: '12px', maxWidth: '440px', flex: '1 1 440px' }}>
              <input name="q" defaultValue={q || ''} className="input" placeholder="Search charities..." style={{ flex: 1 }} />
              <button type="submit" className="btn-lime" style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>Search</button>
              {q && <Link href="/charities" className="btn-ghost" style={{ padding: '12px 20px' }}>Clear</Link>}
            </form>
            <Link href="/donate" className="btn-ghost" style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>Donate separately</Link>
          </div>
        </div>

        {(!charities || charities.length === 0) && (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--gray-5)' }}>
            <div className="font-display" style={{ fontSize: '48px', color: 'var(--gray-3)', marginBottom: '16px' }}>
              {q ? 'NO RESULTS' : 'COMING SOON'}
            </div>
            <p>{q ? `No charities match "${q}".` : 'Charities will appear here once added by the admin.'}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {charities?.map(c => (
            <Link key={c.id} href={`/charities/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="hover-card" style={{ background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '4px', overflow: 'hidden', transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer' }}>
              {c.image_url && (
                <div style={{ height: '180px', background: 'var(--gray-2)', overflow: 'hidden' }}>
                  <img src={c.image_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {c.is_featured && <span className="pill pill-pending">Featured</span>}
                </div>
                <h3 className="font-display" style={{ fontSize: '24px' }}>{c.name.toUpperCase()}</h3>
                <p style={{ color: 'var(--gray-5)', fontSize: '14px', lineHeight: 1.65, flex: 1 }}>{c.description}</p>
                {c.upcoming_events && (
                  <div style={{ borderTop: '1px solid var(--gray-3)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--lime)', letterSpacing: '0.1em', marginBottom: '4px' }}>UPCOMING EVENTS</div>
                    <p style={{ fontSize: '13px', color: 'var(--gray-5)' }}>{c.upcoming_events}</p>
                  </div>
                )}
                {c.website && (
                  <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)', fontSize: '13px', textDecoration: 'none', marginTop: 'auto' }}>Visit website →</a>
                )}
              </div>
            </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
