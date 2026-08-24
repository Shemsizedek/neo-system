export type VerificationLevel='DISCOVERED'|'DOCUMENTED'|'VERIFIED'|'DISPUTED'
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

const registry:Record<string,OrangeChipVerificationRecord>={
  NOMNI:{
    asset:'NOMNI',
    level:'DOCUMENTED',
    claimType:'OTHER',
    evidence:[],
    notes:['On-chain Counterparty asset discovered at the Orange Chip™ foundation address.','Off-chain economic or legal claims require separate supporting documentation and review.'],
  },
}

export function getOrangeChipVerification(asset:string):OrangeChipVerificationRecord{
  const key=asset.toUpperCase()
  return registry[key]??{
    asset:key,
    level:'DISCOVERED',
    claimType:'NONE',
    evidence:[],
    notes:['On-chain Counterparty asset discovered at the Orange Chip™ foundation address.','No verified off-chain company, credit, equity, royalty, fund, warrant, surety, rights, or other legal/economic claim is recorded in NEO Explorer.'],
  }
}

export function verificationScore(record:OrangeChipVerificationRecord){
  if(record.level==='VERIFIED')return 100
  if(record.level==='DOCUMENTED')return 60
  if(record.level==='DISPUTED')return 20
  return 35
}
