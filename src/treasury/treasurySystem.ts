export type TreasuryStatus = 'ACTIVE' | 'FOUNDATION' | 'SANDBOX'

export type TreasuryCouncil = {
  id: string
  name: string
  mission: string
  status: TreasuryStatus
}

export type TreasuryFund = {
  id: string
  name: string
  purpose: string
  restricted: boolean
}

export type AssessmentPolicy = {
  id: string
  name: string
  amount: number
  unit: string
  frequency: 'MONTHLY' | 'ANNUAL' | 'SPECIAL'
  dueDay?: number
  graceDay?: number
  authority: string
}

export const treasuryBoundary = 'NEO-TMS is an institutional treasury, trust, assessment and reporting framework. It does not represent private institutions as public agencies, create legal tender status, impose external tax liability, seize assets or establish legal authority by software declaration.'

export const treasuryCouncils: TreasuryCouncil[] = [
  {id:'era',name:'Eternal Revenue Authority',mission:'Assessment policy, member obligations, revenue accounting, appeals, payment plans and receipts.',status:'FOUNDATION'},
  {id:'counterparty',name:'Office of Counterparty Management',mission:'Treasury DEX risk, liquidity, exposure, collateral and counterparty controls.',status:'SANDBOX'},
  {id:'fia',name:'Financial Intelligence Authority',mission:'Financial-crime intelligence, transaction alerts, sanctions screening and case routing.',status:'FOUNDATION'},
  {id:'fin-cn',name:'Financial Crimes Network (FinCN)',mission:'Financial-crime policy coordination and intelligence referrals within the NEO framework.',status:'FOUNDATION'},
  {id:'currency',name:'Office of the Minister of the Currency',mission:'Currency registry, denomination policy, exchange-rate reporting and monetary instrument records.',status:'FOUNDATION'},
  {id:'mint',name:'Global Mint',mission:'Mint inventory, production records, specifications, authentication and distribution.',status:'FOUNDATION'},
  {id:'engraving',name:'Royal Crown House of Engraving & Printing',mission:'Note design, security-feature records, print batches, serial ranges and retirement controls.',status:'FOUNDATION'},
  {id:'trade',name:'Global Trade Council',mission:'Trade-policy coordination, treasury-market access and cross-border economic reporting.',status:'FOUNDATION'},
  {id:'financial-services',name:'Council of Financial Services',mission:'Treasury Window, institutional financial services and administrative resource coordination.',status:'FOUNDATION'},
  {id:'community-development',name:'Smart Community Development Financial Authority',mission:'Project finance, congregation development and commonwealth investment-program administration.',status:'FOUNDATION'},
  {id:'ig',name:'World Treasury Inspector General',mission:'Independent audit, fraud/waste/abuse intake, control testing and exception reporting.',status:'FOUNDATION'}
]

export const treasuryFunds: TreasuryFund[] = [
  {id:'chaplaincy',name:'Chaplaincy Fund',purpose:'Temple operations, domestic work, ministry, outreach and community service.',restricted:true},
  {id:'sick',name:'Sick Collection / Member Relief Fund',purpose:'Authorized food, medication, transportation and emergency member assistance.',restricted:true},
  {id:'birthday',name:'Prophet Birthday Celebration Fund',purpose:'Authorized January 8 celebration expenses.',restricted:true},
  {id:'national-convention',name:'National Convention Fund',purpose:'Convention venue, production, administration and related approved expenses.',restricted:true},
  {id:'world-convention',name:'World Convention Fund',purpose:'World Convention operations, participation and approved event expenses.',restricted:true},
  {id:'trust',name:'World Temple Trust Fund',purpose:'Fiduciary stewardship, beneficiary support and approved ministry, marketplace and commonwealth projects.',restricted:true},
  {id:'forfeiture',name:'World Treasury Forfeiture Fund',purpose:'Accounting for proceeds from lawfully owned or lawfully administered assets, restitution and approved allocations.',restricted:true}
]

export const assessmentPolicies: AssessmentPolicy[] = [
  {
    id:'per-capita-1',
    name:'Per Capita Assessment',
    amount:1,
    unit:'∞',
    frequency:'MONTHLY',
    dueDay:1,
    graceDay:7,
    authority:'Applicable temple governance instrument / membership agreement'
  }
]

export const trustRoles = {
  grantor: 'World Leaders / Global Funder 999 — subject to executed trust instrument',
  trustee: 'World Temple / Holy See of Nun — subject to executed trust instrument',
  beneficiary: 'World Congregation / Global Village — subject to beneficiary schedule'
}

export const treasuryWorkflow = [
  'Contribution / Assessment',
  'Classification',
  'Authorization',
  'Treasury Ledger',
  'Fund Allocation',
  'Settlement',
  'Reconciliation',
  'Audit Trail'
]

export const treasuryPrinciples = [
  'Double-entry accounting',
  'Fund segregation',
  'Separation of duties',
  'Human authorization',
  'Blockchain-verifiable settlement',
  'Full audit trail'
]
