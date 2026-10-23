import { createHash } from 'node:crypto'
const ID=/^[A-Za-z0-9_-]{1,80}$/
const AMOUNT=/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,8})?$/
function digest(x){return createHash('sha256').update(JSON.stringify(x)).digest('hex')}
export function createPayrollReviewLedger(){
 const rows=new Map()
 return Object.freeze({
  propose({id,taskId,workerId,employerId,asset,units,fiatReference,jurisdiction,engagement='contract',assetVerified=false}){
   if(![id,taskId,workerId,employerId].every(v=>typeof v==='string'&&ID.test(v)))throw new TypeError('invalid identifiers')
   if(rows.has(id))throw new Error('duplicate obligation')
   if(!/^[A-Z0-9._-]{1,48}$/.test(asset||''))throw new TypeError('invalid asset')
   if(typeof units!=='string'||!AMOUNT.test(units)||Number(units)<=0)throw new TypeError('invalid amount')
   if(typeof fiatReference!=='string'||!fiatReference.trim())throw new TypeError('fiat wage reference required')
   if(typeof jurisdiction!=='string'||!jurisdiction.trim()||jurisdiction==='unspecified')throw new TypeError('jurisdiction required')
   if(!['contract','employment'].includes(engagement))throw new TypeError('invalid engagement')
   if(assetVerified!==false)throw new TypeError('asset verification must not be supplied by requestor')
   const event={id,taskId,workerId,employerId,asset,units,fiatReference,jurisdiction,engagement,state:'proposed',assetStatus:'unverified',fundingStatus:'unverified',workerConsent:'pending',complianceReview:'pending',signingEnabled:false,transferEnabled:false}
   const entry=Object.freeze({...event,hash:digest(event)})
   rows.set(id,entry);return entry
  },
  list(){return [...rows.values()].map(v=>({...v}))},
  capabilities(){return Object.freeze({persistence:false,wagePayments:false,chainBroadcast:false,shareDistributions:false})}
 })
}
