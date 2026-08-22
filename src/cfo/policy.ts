import type { BillPriorityInput, BillRecommendation, CfoAuthority, CfoWorkstream } from './types'

export const cfoAuthority: CfoAuthority = {
  principal: 'Honorable Larry Shelton',
  estate: 'Larry Shelton Estate',
  operatingAgent: 'NEOsync',
  designation: 'Head Trustee Agent',
  retainedAuthorities: [
    'Legal trustee status and fiduciary accountability',
    'Signatures and regulated-account authority',
    'Beneficiary and discretionary distribution decisions',
    'Final approval for money movement, borrowing, investing and trading'
  ],
  delegatedFunctions: [
    'Financial coordination and decision preparation',
    'Cash-flow, bill-pay and credit analysis',
    'Investment-policy and trading-risk monitoring',
    'Recordkeeping, reconciliation and quarterly reporting',
    'Coordination of approved specialist agents and professional advisers'
  ]
}

export const cfoWorkstreams: CfoWorkstream[] = [
  {id:'cash',name:'Cash Command',objective:'Know available cash, reserves, income, obligations and runway.',status:'NEEDS_DATA',nextAction:'Import approved account and income records.'},
  {id:'bills',name:'Strategic Bill Pay',objective:'Protect essentials and payment history while reducing avoidable interest and fees.',status:'NEEDS_DATA',nextAction:'Build the bill calendar and confirm autopay safeguards.'},
  {id:'credit',name:'Credit Builder',objective:'Improve verified payment history, utilization and credit-file accuracy.',status:'NEEDS_DATA',nextAction:'Import redacted reports and revolving-account statement data.'},
  {id:'investing',name:'Investment Office',objective:'Apply a written policy to reserves, diversification, costs, taxes and long-term goals.',status:'APPROVAL_REQUIRED',nextAction:'Approve goals, risk capacity, reserve floor and investment policy.'},
  {id:'trading',name:'Trading Desk',objective:'Separate risk capital from operating funds and enforce loss and concentration limits.',status:'APPROVAL_REQUIRED',nextAction:'Approve a risk-capital ceiling before any execution workflow.'},
  {id:'reporting',name:'Estate Reporting',objective:'Maintain auditable books, reconciliations, approvals and quarterly trustee reports.',status:'READY',nextAction:'Connect approved records to NEO Books and LEDGER.'}
]

export const cfoApprovalGates = [
  'External money movement',
  'Autopay enrollment or modification',
  'New credit application or account closure',
  'Investment or trade execution',
  'Borrowing, collateral or guarantee',
  'Beneficiary or discretionary distribution',
  'Tax, legal or regulatory filing',
  'Addition of a signer, trustee or account authority'
]

export const cfoWorkflow = [
  'Collect approved data',
  'Classify and reconcile',
  'Analyze and recommend',
  'Trustee approval',
  'Authorized institution executes',
  'Record and verify',
  'Report and review'
]

export function prioritizeBills(bills: readonly BillPriorityInput[]): BillRecommendation[] {
  return bills.map(bill => {
    const reasons: string[] = []
    let priority = 0
    if (bill.essential) { priority += 100; reasons.push('Essential obligation') }
    if (bill.minimumPayment !== undefined) { priority += 50; reasons.push('Protect payment history with at least the minimum') }
    if ((bill.apr ?? 0) >= 20) { priority += 20; reasons.push('High interest cost') }
    if (!bill.autopayEnabled) { priority += 10; reasons.push('Manual due-date risk') }
    priority += Math.max(0, 32 - bill.dueDay)
    return {...bill, priority, recommendedPayment: Math.max(bill.minimumPayment ?? 0, bill.amount), reasons}
  }).sort((a,b) => b.priority - a.priority || a.dueDay - b.dueDay)
}
