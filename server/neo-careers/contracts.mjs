import { createHash } from 'node:crypto'
export const NEO_CAREERS_AUTHORITY = Object.freeze({
  umbrella:'World Trust Authority',
  occupationalStandards:'Global Profession Authority / World Labor Authority',
  program:'NEO Careers',
  settlementNetwork:'Bitcoin / Counterparty',
  currencyRegistryAddress:'18FyntJG9hdXYvanm67mGgbyo1P7adckvg',
  equityRegistryAddress:'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8',
  registryVerification:'pending-independent-chain-verification',
  transfersEnabled:false
})
const ID=/^[A-Za-z0-9_-]{1,80}$/
const ASSET=/^[A-Z0-9._-]{1,48}$/
export function createCareerTask({id,title,description,employerId,compensation,kind='contract',jurisdiction='unspecified'}){
  if(!ID.test(id||'')||!ID.test(employerId||''))throw new TypeError('invalid task or employer identifier')
  if(typeof title!=='string'||!title.trim()||title.length>140)throw new TypeError('invalid title')
  if(typeof description!=='string'||!description.trim()||description.length>4000)throw new TypeError('invalid description')
  if(!['contract','employment','volunteer'].includes(kind))throw new TypeError('unsupported engagement')
  if(!compensation||typeof compensation!=='object')throw new TypeError('compensation required')
  const {asset,units,fiatReference,assetVerified=false}=compensation
  if(!ASSET.test(asset||''))throw new TypeError('unrecognized asset format')
  if(typeof units!=='string'||!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,8})?$/.test(units)||Number(units)<=0)throw new TypeError('positive decimal units required')
  if(assetVerified!==false)throw new TypeError('asset status must come from an independent registry verifier')
  if(typeof fiatReference!=='string'||!fiatReference.trim())throw new TypeError('fiat wage/reference terms required')
  return Object.freeze({id,title:title.trim(),description:description.trim(),employerId,kind,jurisdiction,compensation:Object.freeze({asset,units,fiatReference,verification:'unverified',release:'disabled'}),status:'draft'})
}
export function createAwardProposal({taskId,contributorId,reviewerId,qualityScore,asset,units,awardType='task-reward',equityTermsUrl=null}){
 if(![taskId,contributorId,reviewerId].every(x=>ID.test(x||'')))throw new TypeError('invalid identifiers')
 if(contributorId===reviewerId)throw new TypeError('reviewer independence required')
 if(!Number.isInteger(qualityScore)||qualityScore<0||qualityScore>100)throw new TypeError('quality score 0-100 required')
 if(!ASSET.test(asset||'')||typeof units!=='string'||!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,8})?$/.test(units)||Number(units)<=0)throw new TypeError('invalid proposed award')
 if(!['task-reward','employment-bonus','equity-grant','dividend'].includes(awardType))throw new TypeError('invalid award type')
 if(['equity-grant','dividend'].includes(awardType)&&(!equityTermsUrl||!/^https:\/\//.test(equityTermsUrl)))throw new TypeError('equity awards require published offering or distribution terms')
 const payload={taskId,contributorId,reviewerId,qualityScore,asset,units,awardType,equityTermsUrl}
 return Object.freeze({...payload,receipt: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),state:'review-required',approved:false,transferEnabled:false,legalReviewRequired:true})
}
