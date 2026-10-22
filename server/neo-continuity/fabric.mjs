import crypto from 'node:crypto'
import {createServiceObjective,verifyBackup,evaluateRecoveryReadiness,chooseFailoverRoute,createRecoveryManifest,verifyRecoveryManifest,runContinuityExercise,continuityDashboard} from '../neo-router/resilience-continuity.mjs'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createBackupRecord({id,service,storageObjectId,digest,createdAt=now(),location='primary',offsite=false,walPosition=null,pitrTimestamp=null}={}){
  if(!id||!service||!storageObjectId||!digest)throw new TypeError('id, service, storageObjectId and digest required')
  return {id,service,storage_object_id:storageObjectId,digest,createdAt,location,offsite:Boolean(offsite),wal_position:walPosition,pitr_timestamp:pitrTimestamp,verified:false,restore_verified:false}
}

export function verifyBackupRecord(record,{expectedDigest,nowAt=new Date()}={}){
  const base=verifyBackup({backup:{id:record.id,createdAt:record.createdAt,digest:record.digest},expectedDigest,now:nowAt})
  return {...record,verified:base.valid,verification:base}
}

export function createWalArchive({service,fromLsn,toLsn,objectId,digest,createdAt=now()}={}){
  if(!service||!fromLsn||!toLsn||!objectId||!digest)throw new TypeError('wal archive fields required')
  return {archive_id:`WAL-${crypto.randomUUID()}`,service,from_lsn:fromLsn,to_lsn:toLsn,storage_object_id:objectId,digest,created_at:createdAt,verified:false}
}

export function verifyWalChain(archives=[]){
  if(!archives.length)return {valid:false,reason:'no_archives',gaps:[]}
  const rows=[...archives].sort((a,b)=>String(a.from_lsn).localeCompare(String(b.from_lsn),undefined,{numeric:true}))
  const gaps=[]
  for(let i=1;i<rows.length;i++)if(String(rows[i-1].to_lsn)!==String(rows[i].from_lsn))gaps.push({from:rows[i-1].to_lsn,to:rows[i].from_lsn})
  return {valid:gaps.length===0,gaps,count:rows.length}
}

export function planPointInTimeRecovery({service,baseBackup,walArchives=[],targetTime}={}){
  if(!service||!baseBackup?.verified||!targetTime)throw new Error('verified_base_backup_and_target_required')
  const chain=verifyWalChain(walArchives)
  return {
    recovery_id:`PITR-${crypto.randomUUID()}`,
    service,
    base_backup_id:baseBackup.id,
    target_time:new Date(targetTime).toISOString(),
    wal_archive_ids:walArchives.map(x=>x.archive_id),
    wal_chain_valid:chain.valid,
    authorized:false,
    created_at:now()
  }
}

export function recordRestoreVerification({backup,restoredDigest,integrityOk,completedAt=now()}={}){
  const digestOk=Boolean(backup?.digest&&restoredDigest===backup.digest)
  return {...clone(backup),restore_verified:Boolean(digestOk&&integrityOk),restore_verification:{digest_ok:digestOk,integrity_ok:Boolean(integrityOk),completed_at:completedAt}}
}

export function evaluateEstateContinuity({service,criticality='high',policy,backup,replicaHealth='unknown',routes=[]}={}){
  const cfg=policy.objectives[criticality]||policy.objectives.standard
  const objective=createServiceObjective({id:`OBJ-${service}`,service,rtoMinutes:cfg.rto_minutes,rpoMinutes:cfg.rpo_minutes,criticality})
  const backupVerification=backup?.verification||{valid:false,ageMinutes:Infinity}
  const readiness=evaluateRecoveryReadiness({objective,latestBackup:backup,backupVerification,replicaHealth})
  const offsiteOk=Boolean(backup?.offsite)
  const restoreOk=Boolean(backup?.restore_verified)
  return {
    service,
    objective,
    readiness:{...readiness,ready:Boolean(readiness.ready&&offsiteOk&&restoreOk)},
    offsite_ok:offsiteOk,
    restore_verified:restoreOk,
    routes:clone(routes),
    continuity_ready:Boolean(readiness.ready&&offsiteOk&&restoreOk)
  }
}

export function buildFailoverDecision({service,primary,backups=[],preapproved=false}={}){
  const route=chooseFailoverRoute({service,primary,backups})
  const automatic=preapproved&&route.mode==='failover'
  return {...route,automatic,requires_authority:route.mode==='failover'&&!preapproved}
}

export function createDrExercise({id,scenario,serviceResults=[]}={}){
  const checks=serviceResults.map(x=>({name:x.service,passed:x.continuity_ready===true}))
  const routes=serviceResults.flatMap(x=>x.routes||[])
  const result=runContinuityExercise({id,scenario,objectives:serviceResults.map(x=>x.objective),routes,checks})
  return {...result,services:serviceResults.map(x=>x.service),evidence_digest:hash({id,scenario,checks,routes})}
}

export function createContinuityManifest({service,backup,target,steps}={}){
  return createRecoveryManifest({id:`RCV-${crypto.randomUUID()}`,service,source:{backup:backup?.id,object:backup?.storage_object_id},target,backupId:backup?.id,steps})
}

export function verifyContinuityManifest(manifest){return verifyRecoveryManifest(manifest)}

export function estateContinuitySnapshot({serviceResults=[],exercises=[],routes=[]}={}){
  const dashboard=continuityDashboard({objectives:serviceResults.map(x=>x.objective),readiness:serviceResults.map(x=>x.readiness),exercises,routes})
  return {estate:'Global Vast Estate',fabric:'NEO Sovereign Continuity',dashboard,services:serviceResults.map(x=>({service:x.service,ready:x.continuity_ready,rto:x.objective.rtoMinutes,rpo:x.objective.rpoMinutes,offsite:x.offsite_ok,restore_verified:x.restore_verified})),generated_at:now()}
}
