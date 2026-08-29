import crypto from 'node:crypto';

const clean=value=>String(value??'').trim();
const REQUIRED_EVIDENCE=['issuerId','legalObligationRef','redemptionTermsRef','backingAccountRef','custodianRef','attestationRef'];

export function createRecognitionGate({now=()=>new Date().toISOString()}={}){
  const assessments=new Map();
  function assess(input){
    const amount=Number(input.amount),backingValue=Number(input.backingValue);
    if(!clean(input.positionId)||!clean(input.unit)||!Number.isFinite(amount)||amount<=0)throw new Error('positionId, unit, and positive amount are required');
    const missingEvidence=REQUIRED_EVIDENCE.filter(key=>!clean(input[key]));
    const coverageRatio=Number.isFinite(backingValue)&&amount>0?Number((backingValue/amount).toFixed(8)):0;
    const currentTime=Date.parse(now());const attestationTime=Date.parse(input.attestationAsOf);
    const stale=!Number.isFinite(attestationTime)||currentTime-attestationTime>31*24*60*60*1000||attestationTime>currentTime;
    const blockers=[...missingEvidence.map(key=>`missing:${key}`),...(coverageRatio<1?['insufficient_backing']:[]),...(stale?['stale_or_invalid_attestation']:[])];
    const row={id:crypto.randomUUID(),positionId:clean(input.positionId),unit:clean(input.unit).toUpperCase(),amount,backingValue:Number.isFinite(backingValue)?backingValue:0,coverageRatio,missingEvidence,blockers,status:blockers.length?'BLOCKED':'ELIGIBLE_FOR_HUMAN_REVIEW',recognized:false,assessedAt:now(),approval:null};
    assessments.set(row.id,row);return row;
  }
  function approve(id,input){
    const row=assessments.get(id);if(!row)return null;
    if(row.status!=='ELIGIBLE_FOR_HUMAN_REVIEW')throw new Error('assessment is not eligible for approval');
    for(const key of ['approverId','authorityRef'])if(!clean(input[key]))throw new Error(`${key} is required`);
    row.approval={approverId:clean(input.approverId),authorityRef:clean(input.authorityRef),approvedAt:now()};row.status='APPROVED_FOR_ACCOUNTING_POLICY';
    row.recognized=false;return row;
  }
  return{assess,approve,assessments,requiredEvidence:REQUIRED_EVIDENCE};
}
