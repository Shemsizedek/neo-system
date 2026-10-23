import { createHash } from 'node:crypto'
const ID = /^[a-zA-Z0-9_-]{1,80}$/
const ASSET = /^[A-Z0-9._-]{1,48}$/
export const ISSUER_REFERENCES = Object.freeze({
  currencies:'18FyntJG9hdXYvanm67mGgbyo1P7adckvg',
  shares:'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'
})
function requireId(id){if(typeof id !== 'string'||!ID.test(id))throw new TypeError('invalid identity');return id}
export function createCareersDirectory(){
 const profiles=new Map(), assets=new Map()
 return Object.freeze({
  enroll({id,role,displayName,jurisdiction='unspecified'}){
   requireId(id)
   if(!['contributor','employer','reviewer'].includes(role))throw new TypeError('invalid role')
   if(typeof displayName!=='string'||!displayName.trim()||displayName.length>120)throw new TypeError('invalid display name')
   if(profiles.has(id))throw new Error('duplicate identity')
   const p=Object.freeze({id,role,displayName:displayName.trim(),jurisdiction,authentication:'not-linked',employmentVerification:'pending',walletOwnership:'unverified',status:'draft'})
   profiles.set(id,p);return p
  },
  listProfiles(){return [...profiles.values()].map(p=>({...p}))},
  registerAssetCandidate({asset,kind,issuerAddress}){
   if(typeof asset!=='string'||!ASSET.test(asset))throw new TypeError('invalid asset')
   if(!['currency','equity'].includes(kind))throw new TypeError('invalid asset type')
   const expected=kind==='currency'?ISSUER_REFERENCES.currencies:ISSUER_REFERENCES.shares
   if(issuerAddress!==expected)throw new TypeError('unexpected issuer reference')
   if(assets.has(asset))throw new Error('duplicate asset')
   const entry=Object.freeze({asset,kind,issuerAddress,chain:'bitcoin-counterparty',issuance:'unverified',transferability:'unverified',legalRights:'unverified',payrollEligible:false,distributionEligible:false})
   assets.set(asset,entry);return entry
  },
  listAssets(){return [...assets.values()].map(a=>({...a}))},
  capabilities(){return Object.freeze({identityProviderConnected:false,liveTokenVerification:false,payrollEnabled:false,shareTransfersEnabled:false})}
 })
}
export function auditDigest(event){return createHash('sha256').update(JSON.stringify(event)).digest('hex')}
