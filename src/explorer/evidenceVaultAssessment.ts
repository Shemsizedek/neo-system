import type {OrangeChipEvidenceRecord} from './orangeChipEvidence'
import type {OrangeChipVerificationRecord,VerificationLevel} from './orangeChipVerification'

export type PersistentEvidenceAssessment={
  asset:string
  accepted:number
  rejected:number
  conflicted:number
  unreviewed:number
  recommendedLevel:VerificationLevel
  score:number
  rationale:string[]
}

export function assessPersistentEvidence(asset:string,records:OrangeChipEvidenceRecord[],current:OrangeChipVerificationRecord):PersistentEvidenceAssessment{
  const accepted=records.filter(r=>r.reviewStatus==='ACCEPTED').length
  const rejected=records.filter(r=>r.reviewStatus==='REJECTED').length
  const conflicted=records.filter(r=>r.reviewStatus==='CONFLICTED').length
  const unreviewed=records.filter(r=>r.reviewStatus==='UNREVIEWED').length
  let recommendedLevel:VerificationLevel=current.level
  const rationale:string[]=[]
  if(conflicted>0){recommendedLevel='DISPUTED';rationale.push('Conflicting persistent evidence requires resolution before verification.')}
  else if(accepted>=2){recommendedLevel='VERIFIED';rationale.push('At least two accepted persistent evidence records support a verification recommendation.')}
  else if(accepted===1){recommendedLevel='DOCUMENTED';rationale.push('One accepted persistent evidence record supports documentation status.')}
  else {recommendedLevel='LISTED';rationale.push('Listing provenance exists, but no accepted persistent off-chain evidence is recorded.')}
  const score=recommendedLevel==='VERIFIED'?100:recommendedLevel==='DOCUMENTED'?65:recommendedLevel==='DISPUTED'?20:40
  return {asset:asset.toUpperCase(),accepted,rejected,conflicted,unreviewed,recommendedLevel,score,rationale}
}
