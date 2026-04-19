import { stripe } from '@/lib/stripe/client'
import { NextResponse } from 'next/server'
import { getRegionConfig } from '@/lib/scalability/config'

export async function POST(req: Request) {
  const { amount, email, name, charityId, charityName, countryCode } = await req.json()
  const donationAmount = Number(amount)
  const region = getRegionConfig(countryCode)

  if (!donationAmount || donationAmount < 1) {
    return NextResponse.json({ error: 'Invalid donation amount' }, { status: 400 })
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: 'Missing app url' }, { status: 500 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email || undefined,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/donate?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/donate`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: region.currency,
          product_data: {
            name: charityName ? `Donation to ${charityName}` : 'GolfDraw Donation',
            description: 'Independent donation, not tied to gameplay',
          },
          unit_amount: Math.round(donationAmount * 100),
        },
      },
    ],
    metadata: {
      donation_amount: String(donationAmount),
      charity_id: charityId || '',
      charity_name: charityName || '',
      donor_name: name || '',
      country_code: region.countryCode,
      currency: region.currency,
    },
  })

  return NextResponse.json({ url: session.url })
}
