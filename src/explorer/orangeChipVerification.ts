export type VerificationLevel='LISTED'|'DOCUMENTED'|'VERIFIED'|'DISPUTED'
export type OffChainClaimType='NONE'|'COMPANY'|'ORGANIZATION'|'PRIVATE_CREDIT'|'SURETY'|'WARRANT'|'RIGHTS'|'ROYALTY'|'PRIVATE_EQUITY'|'SPECIALIZED_CAPITAL'|'FUND'|'OTHER'

export type EvidenceDocument={
  id:string
  title:string
  url?:string
  issuer?:string
  observedAt?:string
  status:'UNREVIEWED'|'ACCEPTED'|'REJECTED'
  note?:string
}

export type OrangeChipVerificationRecord={
  asset:string
  level:VerificationLevel
  claimType:OffChainClaimType
  legalEntity?:string
  jurisdiction?:string
  evidence:EvidenceDocument[]
  notes:string[]
}

const registry:Record<string,OrangeChipVerificationRecord>={}

export function getOrangeChipVerification(asset:string):OrangeChipVerificationRecord{
  const key=asset.toUpperCase()
  return registry[key]??{
    asset:key,
    level:'LISTED',
    claimType:'NONE',
    evidence:[],
    notes:[
      'Orange Chip™ Stock listing status is established by valid Counterparty issuance provenance from the Central Listing Wallet.',
      'No off-chain company, credit, equity, royalty, fund, warrant, surety, rights, or other legal/economic claim is verified unless separately documented and reviewed.',
    ],
  }
}

export function verificationScore(record:OrangeChipVerificationRecord){
  if(record.level==='VERIFIED')return 100
  if(record.level==='DOCUMENTED')return 65
  if(record.level==='DISPUTED')return 20
  return 40
}
