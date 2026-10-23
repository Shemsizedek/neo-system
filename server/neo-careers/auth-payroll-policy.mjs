import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
const hash=x=>createHash('sha256').update(x).digest('hex')
export function createCareersChallengeStore({now=()=>Date.now(),ttlMs=300000}={}){
 if(!Number.isInteger(ttlMs)||ttlMs<1000||ttlMs>600000)throw new TypeError('invalid ttl')
 const pending=new Map()
 return Object.freeze({
  issue({subject,origin,audience='neo-careers'}){
   if(!/^[A-Za-z0-9_-]{1,80}$/.test(subject||''))throw new TypeError('invalid subject')
   if(typeof origin!=='string'||!/^https:\/\/[^\s/]+$/.test(origin))throw new TypeError('invalid origin')
   const nonce=randomBytes(24).toString('hex'), expiresAt=now()+ttlMs
   const message=['NEO Careers sign-in','subject='+subject,'origin='+origin,'audience='+audience,'nonce='+nonce,'expires='+expiresAt].join('\n')
   pending.set(hash(nonce),{subject,origin,audience,expiresAt,digest:hash(message)})
   return Object.freeze({nonce,message,expiresAt})
  },
  async consume({nonce,message,subject,origin,verify}){
   if(typeof nonce!=='string'||!/^[a-f0-9]{48}$/.test(nonce))return false
   const key=hash(nonce),entry=pending.get(key)
   if(!entry)return false
   pending.delete(key) // burn before asynchronous verification, preventing reuse
   if(now()>entry.expiresAt||entry.subject!==subject||entry.origin!==origin||typeof message!=='string'||typeof verify!=='function')return false
   const expected=Buffer.from(entry.digest,'hex'),actual=Buffer.from(hash(message),'hex')
   if(!timingSafeEqual(expected,actual))return false
   return (await verify(message))===true
  },
  capabilities(){return {storage:'memory-only',oidcEnabled:false,sessionIssuerEnabled:false,payoutEnabled:false}}
 })
}
export function assessPayrollRelease({employerVerified=false,workerVerified=false,assetVerified=false,termsAccepted=false,fundsConfirmed=false,laborTaxReview=false,securitiesReview=false,awardType='wage'}={}){
 const reasons=[]
 if(!employerVerified)reasons.push('employer_verification')
 if(!workerVerified)reasons.push('worker_verification')
 if(!assetVerified)reasons.push('asset_verification')
 if(!termsAccepted)reasons.push('worker_terms')
 if(!fundsConfirmed)reasons.push('funding_confirmation')
 if(!laborTaxReview)reasons.push('labor_tax_review')
 if(['equity','dividend'].includes(awardType)&&!securitiesReview)reasons.push('securities_review')
 if(!['wage','contract','reward','equity','dividend'].includes(awardType))reasons.push('unknown_award_type')
 return Object.freeze({eligibleForManualReview:reasons.length===0,missing:reasons,signingEnabled:false,transferEnabled:false})
}
