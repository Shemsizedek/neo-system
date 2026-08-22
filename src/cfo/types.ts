export type CfoWorkstreamStatus = 'READY' | 'NEEDS_DATA' | 'APPROVAL_REQUIRED'

export type CfoWorkstream = {
  id: 'cash' | 'bills' | 'credit' | 'investing' | 'trading' | 'reporting'
  name: string
  objective: string
  status: CfoWorkstreamStatus
  nextAction: string
}

export type CfoAuthority = {
  principal: string
  estate: string
  operatingAgent: string
  designation: string
  retainedAuthorities: string[]
  delegatedFunctions: string[]
}

export type BillPriorityInput = {
  id: string
  name: string
  amount: number
  dueDay: number
  essential: boolean
  minimumPayment?: number
  apr?: number
  autopayEnabled: boolean
}

export type BillRecommendation = BillPriorityInput & {
  priority: number
  recommendedPayment: number
  reasons: string[]
}
