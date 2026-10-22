import test from 'node:test'
import assert from 'node:assert/strict'
import policy from '../../architecture/neo-continuity-fabric-policy.json' with {type:'json'}
import {createBackupRecord,verifyBackupRecord,createWalArchive,verifyWalChain,planPointInTimeRecovery,recordRestoreVerification,evaluateEstateContinuity,buildFailoverDecision,createDrExercise,estateContinuitySnapshot} from './fabric.mjs'

test('backup requires verified digest and restore evidence for continuity readiness',()=>{
 let b=createBackupRecord({id:'b1',service:'neo-state',storageObjectId:'sha256:x',digest:'abc',createdAt:new Date().toISOString(),offsite:true})
 b=verifyBackupRecord(b,{expectedDigest:'abc'})
 b=recordRestoreVerification({backup:b,restoredDigest:'abc',integrityOk:true})
 const r=evaluateEstateContinuity({service:'neo-state',criticality:'critical',policy,backup:b,replicaHealth:'healthy'})
 assert.equal(r.continuity_ready,true)
})

test('wal chain detects gaps before PITR',()=>{
 const a=createWalArchive({service:'db',fromLsn:'1',toLsn:'2',objectId:'a',digest:'x'})
 const b=createWalArchive({service:'db',fromLsn:'3',toLsn:'4',objectId:'b',digest:'y'})
 assert.equal(verifyWalChain([a,b]).valid,false)
})

test('pitr plan never authorizes itself',()=>{
 let b=createBackupRecord({id:'b',service:'db',storageObjectId:'o',digest:'d'})
 b={...b,verified:true}
 const p=planPointInTimeRecovery({service:'db',baseBackup:b,walArchives:[createWalArchive({service:'db',fromLsn:'1',toLsn:'2',objectId:'x',digest:'y'})],targetTime:new Date()})
 assert.equal(p.authorized,false)
})

test('failover may be automatic only when route is preapproved',()=>{
 const x=buildFailoverDecision({service:'api',primary:{id:'a',status:'down'},backups:[{id:'b',status:'healthy'}],preapproved:true})
 assert.equal(x.automatic,true)
})

test('DR exercise and Estate snapshot preserve service readiness',()=>{
 const result={service:'api',continuity_ready:false,objective:{rtoMinutes:30,rpoMinutes:15},readiness:{ready:false},offsite_ok:false,restore_verified:false,routes:[]}
 const ex=createDrExercise({id:'dr1',scenario:'site outage',serviceResults:[result]})
 assert.equal(ex.status,'needs-remediation')
 assert.equal(estateContinuitySnapshot({serviceResults:[result],exercises:[ex]}).estate,'Global Vast Estate')
})
