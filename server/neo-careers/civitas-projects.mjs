import {createHash} from 'node:crypto'
const ID=/^[A-Za-z0-9_-]{1,80}$/
const STAGES=['site-planning','foundation','utility-core','living-shell','energy-crown','inspection','occupancy']
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
export function createCivitasProjectRegistry(){
 const projects=new Map(),events=new Map()
 function get(id){const p=projects.get(id);if(!p)throw new Error('unknown project');return p}
 return Object.freeze({
  register({id,siteCode,jurisdiction,partnerType='unconfirmed',priority='homeless-first'}){
   if(!ID.test(id||'')||!ID.test(siteCode||''))throw new TypeError('invalid project id')
   if(typeof jurisdiction!=='string'||!jurisdiction.trim()||jurisdiction==='unspecified')throw new TypeError('jurisdiction required')
   if(!['unconfirmed','local-government','national-government','nonprofit','community'].includes(partnerType))throw new TypeError('partner type invalid')
   if(!['homeless-first','general'].includes(priority))throw new TypeError('invalid priority')
   if(projects.has(id))throw new Error('duplicate project')
   const p=Object.freeze({id,siteCode,jurisdiction,partnerType,partnerAgreementVerified:false,priority,phase:'site-planning',siteControlVerified:false,permitVerified:false,ownershipVerified:false,publiclyFunded:false,availableHousing:false})
   projects.set(id,p);events.set(id,[]);return p
  },
  proposeMilestone({projectId,stage,reviewerId,evidenceDigest}){
   get(projectId)
   if(!STAGES.includes(stage)||!ID.test(reviewerId||'')||typeof evidenceDigest!=='string'||!/^[a-f0-9]{64}$/.test(evidenceDigest))throw new TypeError('invalid milestone evidence')
   const e={projectId,stage,reviewerId,evidenceDigest,status:'review-required',constructionApproved:false,inspectionPassed:false}
   const receipt=digest(e);const record=Object.freeze({...e,receipt})
   events.get(projectId).push(record);return record
  },
  getProject(id){return {...get(id),milestones:[...events.get(id)]}},
  capabilities(){return Object.freeze({storage:'memory-only',fundsTransfer:false,titleTransfer:false,governmentPartnershipCertified:false})}
 })
}
export function proposeCivitasTreasuryEntry({projectId,participantId,category,amount,referenceId}={}){
 if(![projectId,participantId,referenceId].every(x=>ID.test(x||'')))throw new TypeError('invalid references')
 if(!['earned-wage','housing-contribution','training-credit','material-sponsorship'].includes(category))throw new TypeError('invalid category')
 if(typeof amount!=='string'||!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,8})?$/.test(amount)||Number(amount)<=0)throw new TypeError('invalid amount')
 const e={projectId,participantId,category,amount,referenceId,status:'proposed',clearedFunds:false,legalOwnership:false}
 return Object.freeze({...e,receipt:digest(e),transferEnabled:false})
}
