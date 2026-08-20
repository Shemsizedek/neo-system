export type SettlementRail='Bitcoin'|'Lightning'|'Counterparty XCP'
export type WireStatus='DEMO_PENDING'|'DEMO_SETTLED'|'DEMO_PAID'

export interface WireTransaction{
  id:string
  kind:'WIRE'|'MOBILE'|'ASSET'
  party:string
  amount:number
  currency:string
  rail:SettlementRail
  status:WireStatus
  createdAt:string
}

export interface WireQuote{
  amount:number
  currency:string
  rail:SettlementRail
  display:string
  networkFeeLabel:string
}

export interface NetworkService{
  id:string
  name:string
  status:'READY'|'ACTIVE'|'SANDBOX'
  description:string
}
