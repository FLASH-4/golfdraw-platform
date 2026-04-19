import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is missing. Webhook cannot write subscriptions.' },
      { status: 500 }
    )
  }

  // New subscription created via checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const userId = session?.metadata?.userId
    const plan = session.metadata?.plan || 'monthly'
    if (userId && session?.customer && session?.subscription) {
      const daysToAdd = plan === 'yearly' ? 365 : 30
      const payload = {
        user_id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        plan,
        status: 'active',
        current_period_end: new Date(Date.now() + daysToAdd * 86400000).toISOString(),
      }

      const { data: existingSubs, error: existingSubError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      if (existingSubError) return NextResponse.json({ error: existingSubError.message }, { status: 500 })

      const existingSub = Array.isArray(existingSubs) ? existingSubs[0] : null

      const { error } = existingSub
        ? await supabase.from('subscriptions').update(payload).eq('id', existingSub.id)
        : await supabase.from('subscriptions').insert(payload)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Subscription renewed — update period end + log charity contribution
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as any
    const periodEnd = invoice?.lines?.data?.[0]?.period?.end
    if (invoice?.subscription && periodEnd) {
      await supabase.from('subscriptions')
        .update({
          status: 'active',
          current_period_end: new Date(periodEnd * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', invoice?.subscription)

      // Log charity contribution
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', invoice?.subscription || '')
        .single()

      if (sub) {
        const { data: profileEmail } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', sub.user_id)
          .maybeSingle()

        const { data: profile } = await supabase
          .from('profiles')
          .select('charity_id, charity_percentage')
          .eq('id', sub.user_id)
          .single()

        if (profile?.charity_id) {
          const totalAmount = invoice.amount_paid / 100
          const charityAmount = totalAmount * (profile.charity_percentage / 100)
          await supabase.from('charity_contributions').insert({
            user_id: sub.user_id,
            charity_id: profile.charity_id,
            amount: charityAmount,
            subscription_amount: totalAmount,
            percentage: profile.charity_percentage,
            period_start: new Date((invoice?.period_start || 0) * 1000).toISOString(),
          })
        }

        if (profileEmail?.email) {
          const amountText = ((invoice?.amount_paid || 0) / 100).toFixed(2)
          const charityText = profile?.charity_id
            ? `Your selected charity allocation has been recorded (${profile.charity_percentage}%).`
            : 'You have not selected a charity yet.'

          await sendEmail({
            to: profileEmail.email,
            subject: 'GolfDraw payment received',
            html: `<p>Hi ${profileEmail.full_name || 'there'},</p><p>We received your subscription payment of £${amountText}.</p><p>${charityText}</p><p>Thanks for supporting GolfDraw.</p>`,
          })
        }
      }
    }
  }

  // Subscription cancelled
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as { id: string }
    await supabase.from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', sub.id)
  }

  // Payment failed — mark lapsed
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as any
    if (invoice?.subscription) {
      await supabase.from('subscriptions')
        .update({ status: 'lapsed' })
        .eq('stripe_subscription_id', invoice?.subscription)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', invoice.subscription)
        .maybeSingle()

      if (sub?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', sub.user_id)
          .maybeSingle()

        if (profile?.email) {
          await sendEmail({
            to: profile.email,
            subject: 'GolfDraw payment failed',
            html: `<p>Hi ${profile.full_name || 'there'},</p><p>Your recent subscription payment could not be processed.</p><p>Please update your payment method to keep your GolfDraw subscription active.</p>`,
          })
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
