import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createTradeline(input={}){
  if(!input.tradeline_id||!input.subject_id||!input.account_ref||!input.creditor_ref)throw new TypeError('tradeline_id, subject_id, account_ref and creditor_ref required')
  return {
    tradeline_id:String(input.tradeline_id),
    subject_id:String(input.subject_id),
    account_ref:String(input.account_ref),
    creditor_ref:String(input.creditor_ref),
    account_type:input.account_type||'INSTALLMENT',
    opened_at:input.opened_at||null,
    status:input.status||'OPEN',
    credit_limit:input.credit_limit==null?null:Number(input.credit_limit),
    original_amount:input.original_amount==null?null:Number(input.original_amount),
    current_balance:Number(input.current_balance||0),
    past_due_amount:Number(input.past_due_amount||0),
    days_past_due:Number(input.days_past_due||0),
    payment_status:input.payment_status||'CURRENT',
    evidence_refs:clone(input.evidence_refs||[]),
    updated_at:now()
  }
}

export function createProof({proof_type,subject_id,tradeline_id,evidence_refs=[],facts={}}={}){
  if(!['PROOF_OF_PAYMENT','PROOF_OF_CREDIT','PROOF_OF_REPUTATION'].includes(String(proof_type)))throw new Error('invalid_proof_type')
  if(!subject_id||!tradeline_id||!evidence_refs.length)throw new TypeError('subject, tradeline and evidence required')
  const record={
    proof_id:`PRF-${crypto.randomUUID()}`,
    proof_type:String(proof_type),
    subject_id:String(subject_id),
    tradeline_id:String(tradeline_id),
    evidence_refs:[...evidence_refs],
    facts:clone(facts),
    issued_at:now()
  }
  return {...record,digest:sha(record)}
}

export function mapTradelineToMetro2(tradeline={}){
  const missing=[]
  if(!tradeline.tradeline_id)missing.push('tradeline_id')
  if(!tradeline.account_type)missing.push('account_type')
  if(tradeline.current_balance==null)missing.push('current_balance')
  if(!tradeline.payment_status)missing.push('payment_status')
  return {
    tradeline_id:tradeline.tradeline_id||null,
    internal_mapping:{
      portfolio_type:tradeline.account_type,
      current_balance:Number(tradeline.current_balance||0),
      amount_past_due:Number(tradeline.past_due_amount||0),
      payment_rating:String(tradeline.payment_status||'UNKNOWN'),
      account_status:String(tradeline.status||'UNKNOWN')
    },
    complete:missing.length===0,
    missing,
    transmission_status:'ADAPTER_AND_EXTERNAL_CREDENTIALS_REQUIRED'
  }
}

export function createDispute(input={}){
  if(!input.dispute_id||!input.subject_id||!input.tradeline_id||!input.reason)throw new TypeError('dispute fields required')
  return {
    dispute_id:String(input.dispute_id),
    subject_id:String(input.subject_id),
    tradeline_id:String(input.tradeline_id),
    reason:String(input.reason),
    evidence_refs:clone(input.evidence_refs||[]),
    status:'OPEN',
    opened_at:now()
  }
}

export function resolveDispute(dispute,{resolution,evidence_refs=[],tradeline_patch=null}={}){
  if(dispute?.status!=='OPEN')throw new Error('open_dispute_required')
  if(!resolution)throw new TypeError('resolution required')
  return {
    dispute:{...clone(dispute),status:'RESOLVED',resolution:String(resolution),resolution_evidence_refs:[...evidence_refs],resolved_at:now()},
    tradeline_patch:tradeline_patch?clone(tradeline_patch):null
  }
}

export function calculateNeoCreditRating({tradelines=[],proofs=[],disputes=[]}={}){
  let score=100
  const factors=[]
  const open=tradelines.filter(t=>t.status!=='CLOSED')
  const delinquent=tradelines.filter(t=>Number(t.days_past_due||0)>0||t.payment_status==='DELINQUENT')
  if(delinquent.length){const penalty=Math.min(40,delinquent.length*10);score-=penalty;factors.push({factor:'delinquency',impact:-penalty})}
  const utilizationRows=open.filter(t=>Number(t.credit_limit)>0).map(t=>Number(t.current_balance||0)/Number(t.credit_limit))
  const maxUtil=utilizationRows.length?Math.max(...utilizationRows):0
  if(maxUtil>.9){score-=20;factors.push({factor:'utilization_over_90',impact:-20})}
  else if(maxUtil>.5){score-=10;factors.push({factor:'utilization_over_50',impact:-10})}
  else if(maxUtil>.3){score-=5;factors.push({factor:'utilization_over_30',impact:-5})}
  const unresolved=disputes.filter(d=>d.status==='OPEN').length
  if(unresolved){const penalty=Math.min(10,unresolved*2);score-=penalty;factors.push({factor:'open_disputes',impact:-penalty})}
  const verifiedPayments=proofs.filter(p=>p.proof_type==='PROOF_OF_PAYMENT').length
  const bonus=Math.min(10,verifiedPayments)
  if(bonus){score+=bonus;factors.push({factor:'verified_payment_proofs',impact:bonus})}
  score=Math.max(0,Math.min(100,score))
  const stars=score>=90?5:score>=80?4:score>=70?3:score>=60?2:1
  return {score,stars,factors,model:'NEO_INTERNAL_100_POINT_5_STAR',generated_at:now()}
}

export function createRatingHistory({subject_id,rating,previous_digest=null}={}){
  if(!subject_id||!rating)throw new TypeError('subject_id and rating required')
  const r={rating_id:`RAT-${crypto.randomUUID()}`,subject_id:String(subject_id),rating:clone(rating),previous_digest,recorded_at:now()}
  return {...r,digest:sha(r)}
}

export function createCreditPassport({subject_id,tradelines=[],proofs=[],rating,disputes=[],visibility='PRIVATE'}={}){
  if(!subject_id||!rating)throw new TypeError('subject_id and rating required')
  const publicMode=visibility==='PUBLIC'
  return {
    passport_id:`CP-${crypto.randomUUID()}`,
    subject_id:String(subject_id),
    visibility,
    rating:{score:rating.score,stars:rating.stars,model:rating.model},
    tradelines:publicMode
      ? tradelines.map(t=>({tradeline_id:t.tradeline_id,account_type:t.account_type,status:t.status,payment_status:t.payment_status}))
      : clone(tradelines),
    proofs:publicMode
      ? proofs.map(p=>({proof_id:p.proof_id,proof_type:p.proof_type,issued_at:p.issued_at,digest:p.digest}))
      : clone(proofs),
    disputes:publicMode
      ? {open:disputes.filter(d=>d.status==='OPEN').length}
      : clone(disputes),
    generated_at:now()
  }
}

export function createCrownCreditCertificate({passport,rating_history_digest,evidence_refs=[]}={}){
  if(!passport||!rating_history_digest)throw new TypeError('passport and rating history digest required')
  const cert={
    certificate_id:`CRC-${crypto.randomUUID()}`,
    passport_id:passport.passport_id,
    subject_id:passport.subject_id,
    rating:clone(passport.rating),
    rating_history_digest:String(rating_history_digest),
    evidence_refs:[...evidence_refs],
    scope:'INTEGRITY_AND_PROVENANCE',
    external_bureau_status:'NOT_ESTABLISHED',
    issued_at:now()
  }
  return {...cert,digest:sha(cert)}
}

export function creditPassportSnapshot({tradelines=[],proofs=[],disputes=[],ratings=[],passports=[],certificates=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Credit Bureau & Credit Passport Integration',
    tradelines:{total:tradelines.length,delinquent:tradelines.filter(t=>Number(t.days_past_due||0)>0).length},
    proofs:{total:proofs.length,payment:proofs.filter(p=>p.proof_type==='PROOF_OF_PAYMENT').length,credit:proofs.filter(p=>p.proof_type==='PROOF_OF_CREDIT').length},
    disputes:{total:disputes.length,open:disputes.filter(d=>d.status==='OPEN').length},
    ratings:{history:ratings.length},
    passports:{total:passports.length,public:passports.filter(p=>p.visibility==='PUBLIC').length},
    certificates:certificates.length,
    metro2_external_reporting:false,
    external_bureau_status:'NOT_ESTABLISHED',
    generated_at:now()
  }
}
