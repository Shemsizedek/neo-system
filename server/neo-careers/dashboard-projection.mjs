/**
 * G029 dashboard projections: only input from a trusted server-side session.
 * Does not establish an authenticated session, verify tokens or query databases.
 */
import { authorizeCareersSession } from './session-boundary.mjs'
export function projectCareersDashboard({claims,trustedVerification=false,view,ownerId,records=[]}={}){
 const action=view==='worker'?'view-own-tasks':view==='employer'?'manage-employer-drafts':view==='reviewer'?'review-compensation':'unsupported'
 const grant=authorizeCareersSession({claims,trustedVerification,action,resourceOwnerId:ownerId})
 if(!grant.allowed)return Object.freeze({ok:false,reason:grant.reason,records:[]})
 if(!Array.isArray(records))throw new TypeError('records must be array')
 const safe=records.filter(x=>x&&typeof x==='object'&&(
   view==='reviewer' || (view==='worker'&&x.contributorId===claims.sub) ||
   (view==='employer'&&x.employerId===claims.employerId)
 )).map(x=>({
   id:String(x.id??''),title:String(x.title??''),
   state:String(x.state??'draft'),asset:String(x.asset??''),
   units:String(x.units??''),paymentStatus:'not-enabled'
 }))
 return Object.freeze({ok:true,view,records:safe,payrollEnabled:false,walletSigningEnabled:false})
}
