import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectVmStagingReadiness,probeVmStagingHealth } from './staging-readiness.mjs'

test('a healthy free gateway with no signer runtime remains blocked for signing',()=>{
 const result=inspectVmStagingReadiness({expectedWorkspace:'workspace',expectedCommit:'a'.repeat(40),service:{ownerId:'workspace',serviceDetails:{plan:'free',numInstances:1}},deploy:{status:'live',commit:{id:'b'.repeat(40)}},health:{status:200,body:{status:'running',bitcoinAccess:'disabled'}}})
 assert.equal(result.status,'BLOCKED');assert.equal(result.checks.gatewayResponding,true);assert.equal(result.checks.persistentSqlite,false);assert.equal(result.authorizationGranted,false)
})
test('readiness requires matching source, durable mount, live identity and non-fixture device evidence',()=>{
 const input={expectedWorkspace:'workspace',expectedCommit:'a'.repeat(40),service:{ownerId:'workspace',serviceDetails:{numInstances:1,disk:{mountPath:'/var/data'}}},deploy:{status:'live',commit:{id:'a'.repeat(40)}},health:{status:200,body:{status:'running'}},runtime:{schemaVersion:1,service:'neo-vm-signer',network:'regtest',sourceCommit:'a'.repeat(40),identityReady:true,pairingProofVerified:true,fixtureKeys:false,signerProbeVerified:true,outcomeAuditReady:true,approvalStorage:{backend:'sqlite',databasePath:'/var/data/state.sqlite',journalMode:'wal',synchronous:'FULL'}}}
 assert.equal(inspectVmStagingReadiness(input).status,'READY_FOR_REGTEST_REVIEW')
 input.runtime.fixtureKeys=true;assert.equal(inspectVmStagingReadiness(input).status,'BLOCKED')
 input.runtime.fixtureKeys=false;input.runtime.approvalStorage.databasePath='/tmp/state.sqlite';assert.equal(inspectVmStagingReadiness(input).status,'BLOCKED')
})
test('health probe is read-only, bounded and treats unavailable health as unverified',async()=>{
 let options
 const health=await probeVmStagingHealth({baseUrl:'https://example.test',fetchImpl:async(url,input)=>{assert.equal(url.pathname,'/healthz');options=input;return new Response('{"status":"running"}',{headers:{'content-type':'application/json'}})}})
 assert.equal(health.status,200);assert.equal(options.method,'GET');assert.equal(options.redirect,'error')
 const result=await probeVmStagingHealth({baseUrl:'https://example.test',fetchImpl:async()=>{throw Error('private detail')}})
 assert.equal(result.error,'VM_STAGING_HEALTH_UNVERIFIED')
 await assert.rejects(()=>probeVmStagingHealth({baseUrl:'http://example.test'}))
})
