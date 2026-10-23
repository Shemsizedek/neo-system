import { authorizeCareersSession } from './session-boundary.mjs'
/** Dependency-injected PostgreSQL reader. Pool/query credentials supplied only by trusted server. */
export function createCareersRecordsReader({query}={}){
 if(typeof query!=='function')throw new TypeError('trusted database query required')
 return Object.freeze({
  async workerRecords({claims,trustedVerification=false}={}){
   const g=authorizeCareersSession({claims,trustedVerification,action:'view-own-tasks',resourceOwnerId:claims?.sub})
   if(!g.allowed)return {ok:false,records:[],reason:g.reason}
   const res=await query('SELECT p.id,p.task_id,p.asset,p.units,p.status FROM neo_careers.payroll_obligations p JOIN neo_careers.worker_accounts w ON w.id=p.worker_id WHERE w.subject_id=$1 ORDER BY p.created_at DESC LIMIT 100',[g.subject])
   return {ok:true,records:res.rows??[],transfersEnabled:false}
  },
  async employerRecords({claims,trustedVerification=false}={}){
   const g=authorizeCareersSession({claims,trustedVerification,action:'manage-employer-drafts',resourceOwnerId:claims?.employerId})
   if(!g.allowed)return {ok:false,records:[],reason:g.reason}
   const res=await query('SELECT p.id,p.task_id,p.asset,p.units,p.status FROM neo_careers.payroll_obligations p WHERE p.employer_id=$1 ORDER BY p.created_at DESC LIMIT 100',[claims.employerId])
   return {ok:true,records:res.rows??[],transfersEnabled:false}
  },
  capabilities(){return {readOnly:true,migrationsEnabled:false,signingEnabled:false,payrollEnabled:false}}
 })
}
