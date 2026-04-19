export type SupportedCountryCode = 'GB' | 'US' | 'EU'

export type RegionConfig = {
  countryCode: SupportedCountryCode
  currency: 'gbp' | 'usd' | 'eur'
  locale: string
}

const REGION_CONFIG: Record<SupportedCountryCode, RegionConfig> = {
  GB: { countryCode: 'GB', currency: 'gbp', locale: 'en-GB' },
  US: { countryCode: 'US', currency: 'usd', locale: 'en-US' },
  EU: { countryCode: 'EU', currency: 'eur', locale: 'en-IE' },
}

export function resolveCountryCode(rawCountry?: string): SupportedCountryCode {
  const normalized = String(rawCountry || 'GB').toUpperCase()
  if (normalized === 'US') return 'US'
  if (normalized === 'EU') return 'EU'
  return 'GB'
}

export function getRegionConfig(rawCountry?: string): RegionConfig {
  return REGION_CONFIG[resolveCountryCode(rawCountry)]
}

export function getSubscriptionPriceId(plan: 'monthly' | 'yearly', rawCountry?: string): string {
  const country = resolveCountryCode(rawCountry)

  const lookup: Record<SupportedCountryCode, { monthly?: string; yearly?: string }> = {
    GB: {
      monthly: process.env.STRIPE_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_YEARLY_PRICE_ID,
    },
    US: {
      monthly: process.env.STRIPE_MONTHLY_PRICE_ID_US,
      yearly: process.env.STRIPE_YEARLY_PRICE_ID_US,
    },
    EU: {
      monthly: process.env.STRIPE_MONTHLY_PRICE_ID_EU,
      yearly: process.env.STRIPE_YEARLY_PRICE_ID_EU,
    },
  }

  const specific = lookup[country][plan]
  const fallback = plan === 'yearly' ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID
  const priceId = specific || fallback

  if (!priceId) {
    throw new Error(`Missing Stripe price id for plan ${plan}`)
  }

  return priceId
}
