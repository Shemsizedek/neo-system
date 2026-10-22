/** NEO Crown Chain L3 market-intelligence envelope.
 * Bitcoin blocks anchor commitments; Counterparty provides L2 asset operations.
 * This is a schema adapter, not a new genesis, chain or transaction issuer.
 */
export type MarketClass='BOND'|'HOUSING'|'SHARE'|'INDEX'|'FUND'|'OTHER'
export type EvidenceState='OBSERVED'|'DOCUMENTED'|'CALCULATED'|'ATTESTED'|'BITCOIN_CONFIRMED'
export type Measurement={name:string;value:string;unit:string;asOf:string;method?:string;sourceRefs:string[];state:EvidenceState}
export type BitcoinAnchor={blockHeight:number;blockHash:string;transactionId:string;commitmentHash?:string;confirmations?:number;verifiedBy?:string[]}
export type CounterpartyOrigin={asset:string;issuer?:string;issuanceTxid?:string;protocol:'Counterparty'}
export type BondTerms={class:'BOND';faceValue:string;currency:string;couponRate?:string;maturityDate?:string;paymentSchedule?:string;creditEvidenceRefs:string[]}
export type HousingTerms={class:'HOUSING';propertyType?:string;geography:string;unitCount?:number;occupancy?:string;valuationMethod?:string;period:string}
export type ShareTerms={class:'SHARE';issuerName:string;shareClass?:string;outstandingShares?:string;votingRights?:string;reportingPeriod?:string}
export type IndexTerms={class:'INDEX';indexName:string;methodologyRef:string;baseDate?:string;constituents:string[];rebalanceFrequency?:string}
export type FundTerms={class:'FUND';name:string;valuationMethod?:string;reportingPeriod?:string}
export type OtherTerms={class:'OTHER';description:string}
export type MarketTerms=BondTerms|HousingTerms|ShareTerms|IndexTerms|FundTerms|OtherTerms
export type CrownMarketRecord={
  schema:'neo.crown.market.v1'
  recordId:string
  observedAt:string
  terms:MarketTerms
  measurements:Measurement[]
  comparisons:string[]
  provenanceRefs:string[]
  bitcoinAnchor?:BitcoinAnchor
  counterparty?:CounterpartyOrigin
  evidenceState:EvidenceState
}
export function neoScanMarketSummary(record:CrownMarketRecord){
  const t=record.terms
  const headline=t.class==='BOND'? 'Bond':t.class==='HOUSING'?'Housing':t.class==='SHARE'?'Shares':t.class==='INDEX'?'Index':t.class==='FUND'?'Fund':'Asset'
  return {
    id:record.recordId,category:headline,
    title:t.class==='BOND'? 'Bond instrument':t.class==='HOUSING'? t.geography:t.class==='SHARE'?t.issuerName:t.class==='INDEX'?t.indexName:t.class==='FUND'?t.name:t.description,
    anchorStatus:record.evidenceState==='BITCOIN_CONFIRMED'?'Bitcoin confirmed':'Evidence not independently confirmed',
    bitcoinBlock:record.bitcoinAnchor?.blockHeight??null,
    asset:record.counterparty?.asset??null,
    metrics:record.measurements.map(m=>({label:m.name,value:m.value,unit:m.unit,asOf:m.asOf,status:m.state})),
    comparisons:record.comparisons,
    provenanceCount:record.provenanceRefs.length
  }
}
