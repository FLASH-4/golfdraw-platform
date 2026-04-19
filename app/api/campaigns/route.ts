import { NextResponse } from 'next/server'
import { isCampaignsEnabled } from '@/lib/scalability/campaigns'

// Campaign module scaffold kept API-first so mobile/web clients can reuse it later.
export async function GET() {
  return NextResponse.json({
    enabled: isCampaignsEnabled(),
    campaigns: [],
    message: isCampaignsEnabled()
      ? 'Campaigns enabled, data source can be connected.'
      : 'Campaign module is scaffolded and ready for future activation.',
  })
}
