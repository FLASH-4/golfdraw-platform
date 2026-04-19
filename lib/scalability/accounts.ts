export type AccountType = 'individual' | 'team' | 'corporate'

export type TeamRole = 'owner' | 'manager' | 'member'

export type TeamMembership = {
  accountId: string
  userId: string
  role: TeamRole
}

export type AccountSummary = {
  id: string
  name: string
  type: AccountType
  activeSeats: number
  createdAt: string
}

export function isMultiSeatAccount(type: AccountType): boolean {
  return type === 'team' || type === 'corporate'
}
