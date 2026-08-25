import type {OrangeChipVerificationRecord,VerificationLevel,OffChainClaimType} from './orangeChipVerification'

export type EvidenceSourceType='ISSUER_DOCUMENT'|'CORPORATE_RECORD'|'FILING'|'CONTRACT'|'AGREEMENT'|'FINANCIAL_STATEMENT'|'RIGHTS_INSTRUMENT'|'ROYALTY_RECORD'|'CREDIT_DOCUMENT'|'SURETY_DOCUMENT'|'WARRANT_DOCUMENT'|'FUND_DOCUMENT'|'OTHER'
export type EvidenceReviewStatus='UNREVIEWED'|'ACCEPTED'|'REJECTED'|'CONFLICTED'

export type OrangeChipEvidenceInput={
  asset:string
  title:string
  sourceType:EvidenceSourceType
  sourceUrl?:string
  issuer?:string
  jurisdiction?:string
  claimType?:OffChainClaimType
  observedAt?:string
  note?:string
}

export type OrangeChipEvidenceRecord=OrangeChipEvidenceInput&{
  id:string
  reviewStatus:EvidenceReviewStatus
  reviewer?:string
  reviewedAt?:string
  rejectionReason?:string
}

export type EvidenceAssessment={
  asset:string
  accepted:number
  rejected:number
  conflicted:number
  unreviewed:number
  recommendedLevel:VerificationLevel
  score:number
  rationale:string[]
}

const evidenceRegistry:Record<string,OrangeChipEvidenceRecord[]>={}

const uid=(asset:string,title:string)=>`${asset.toUpperCase()}-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${Date.now()}`

export function listOrangeChipEvidence(asset:string){
  return [...(evidenceRegistry[asset.toUpperCase()]??[])]
}

export function ingestOrangeChipEvidence(input:OrangeChipEvidenceInput):OrangeChipEvidenceRecord{
  const key=input.asset.toUpperCase()
  const record:OrangeChipEvidenceRecord={...input,asset:key,id:uid(key,input.title),reviewStatus:'UNREVIEWED'}
  evidenceRegistry[key]=[...(evidenceRegistry[key]??[]),record]
  return record
}

export function reviewOrangeChipEvidence(asset:string,id:string,status:Exclude<EvidenceReviewStatus,'UNREVIEWED'>,reviewer:string,note?:string){
  const key=asset.toUpperCase()
  const records=evidenceRegistry[key]??[]
  const index=records.findIndex(record=>record.id===id)
  if(index<0)return null
  const updated={...records[index],reviewStatus:status,reviewer,reviewedAt:new Date().toISOString(),rejectionReason:status==='REJECTED'?note:records[index].rejectionReason,note:note??records[index].note}
  evidenceRegistry[key]=records.map((record,i)=>i===index?updated:record)
  return updated
}

export function assessOrangeChipEvidence(asset:string,current:OrangeChipVerificationRecord):EvidenceAssessment{
  const records=listOrangeChipEvidence(asset)
  const accepted=records.filter(r=>r.reviewStatus==='ACCEPTED').length
  const rejected=records.filter(r=>r.reviewStatus==='REJECTED').length
  const conflicted=records.filter(r=>r.reviewStatus==='CONFLICTED').length
  const unreviewed=records.filter(r=>r.reviewStatus==='UNREVIEWED').length
  let recommendedLevel:VerificationLevel=current.level
  const rationale:string[]=[]

  if(conflicted>0){recommendedLevel='DISPUTED';rationale.push('Conflicting evidence requires resolution before verification.')}
  else if(accepted>=2){recommendedLevel='VERIFIED';rationale.push('At least two accepted evidence records support the off-chain claim.')}
  else if(accepted===1){recommendedLevel='DOCUMENTED';rationale.push('One accepted evidence record supports documentation status.')}
  else {recommendedLevel='LISTED';rationale.push('Listing provenance exists, but no accepted off-chain evidence is recorded.')}

  const score=recommendedLevel==='VERIFIED'?100:recommendedLevel==='DOCUMENTED'?65:recommendedLevel==='DISPUTED'?20:40
  return {asset:asset.toUpperCase(),accepted,rejected,conflicted,unreviewed,recommendedLevel,score,rationale}
}
