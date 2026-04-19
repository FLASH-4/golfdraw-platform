import { stripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRegionConfig, getSubscriptionPriceId } from '@/lib/scalability/config'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in before starting checkout.' }, { status: 401 })
    }

    const { plan, countryCode } = await req.json()
    const normalizedPlan = plan === 'yearly' ? 'yearly' : 'monthly'
    const region = getRegionConfig(countryCode)
    const priceId = getSubscriptionPriceId(normalizedPlan, region.countryCode)

    const { data: existingSub } = await supabase
      .from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        userId: user.id,
        plan: normalizedPlan,
        countryCode: region.countryCode,
        currency: region.currency,
      },
    }

    if (existingSub?.stripe_customer_id) sessionParams.customer = existingSub.stripe_customer_id
    else sessionParams.customer_email = user.email

    const session = await stripe.checkout.sessions.create(sessionParams)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected checkout error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
