import {createHash} from 'node:crypto'
const ID=/^[A-Za-z0-9_-]{1,80}$/
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
export function assessGovernmentPartnership({partnerId,jurisdiction,authorityName,agreementHash,signatoryVerified=false,authorizationVerified=false,expiryVerified=false}={}){
 if(!ID.test(partnerId||''))throw new TypeError('invalid partner id')
 if(typeof jurisdiction!=='string'||!jurisdiction.trim()||typeof authorityName!=='string'||!authorityName.trim())throw new TypeError('jurisdiction and authority required')
 if(typeof agreementHash!=='string'||!/^[a-f0-9]{64}$/.test(agreementHash))throw new TypeError('document SHA-256 required')
 const verified=signatoryVerified===true&&authorizationVerified===true&&expiryVerified===true
 return Object.freeze({partnerId,jurisdiction,authorityName,agreementHash,verification:verified?'reviewed-evidence':'pending-verification',publicPartnershipClaimPermitted:false,agreementReceipt:sha({partnerId,jurisdiction,authorityName,agreementHash})})
}
export function buildCivitasProjectDashboard({project,partnership,authorizedParticipantId,viewerId,milestones=[],funding=[]}={}){
 if(!project||!ID.test(project.id||''))throw new TypeError('valid project required')
 const authorized=typeof viewerId==='string'&&viewerId===authorizedParticipantId&&ID.test(viewerId)
 const stageNames=['site-planning','foundation','utility-core','living-shell','energy-crown','inspection','occupancy']
 const safeMilestones=milestones.filter(m=>stageNames.includes(m?.stage)&&m?.projectId===project.id).map(m=>({stage:m.stage,status:m?.status==='verified'?'verified':'pending-review'}))
 const safeFunding=funding.filter(f=>f?.projectId===project.id).map(f=>({category:f.category,status:'verification-required'}))
 return Object.freeze({projectId:project.id,siteCode:project.siteCode,priority:project.priority,phase:project.phase,partnerStatus:partnership?.verification??'pending-verification',projectVerified:false,homesAvailable:false,verifiedTitle:false,stipendsDisbursed:false,milestones:safeMilestones,participant:authorized?{id:viewerId,view:'private'}:null,funding:safeFunding,transfersEnabled:false})
}
