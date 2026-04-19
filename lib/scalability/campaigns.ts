export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended'

export type Campaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  startsAt: string | null
  endsAt: string | null
}

export const CAMPAIGNS_FEATURE_FLAG = process.env.NEXT_PUBLIC_ENABLE_CAMPAIGNS === 'true'

export function isCampaignsEnabled(): boolean {
  return CAMPAIGNS_FEATURE_FLAG
}
