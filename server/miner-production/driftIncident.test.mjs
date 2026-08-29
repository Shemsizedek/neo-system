import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {PersistentStateStore} from './persistentStore.mjs'
import {buildRuntimeAttestation} from './runtimeIdentity.mjs'
import {activeRuntimeDriftIncidents,reconcileRuntimeDriftIncident} from './driftIncident.mjs'

const commit='a'.repeat(40)
const digest='sha256:'+'b'.repeat(64)
const secret='test-runtime-attestation-secret'
const identity=overrides=>({buildCommitSha:commit,runtimeImageDigest:digest,authorizedCommitSha:commit,authorizedImageDigest:digest,environment:'test',...overrides})

function withStore(fn){
  const dir=mkdtempSync(join(tmpdir(),'neo-drift-'))
  const store=new PersistentStateStore(join(dir,'state.sqlite'))
  return Promise.resolve(fn(store)).finally(()=>{store.close();rmSync(dir,{recursive:true,force:true})})
}

test('drift opens one persistent CRITICAL global hold incident',()=>withStore(async store=>{
  const att=buildRuntimeAttestation({identity:identity({buildCommitSha:'c'.repeat(40)}),secret})
  const first=await reconcileRuntimeDriftIncident({store,attestation:att,secret})
  const second=await reconcileRuntimeDriftIncident({store,attestation:att,secret})
  assert.equal(first.created,true)
  assert.equal(second.created,false)
  assert.equal(activeRuntimeDriftIncidents(store).length,1)
  assert.equal(first.incident.severity,'CRITICAL')
  assert.equal(first.incident.manualResolutionAllowed,false)
}))

test('verified matching attestation is required before automatic release',()=>withStore(async store=>{
  const bad=buildRuntimeAttestation({identity:identity({runtimeImageDigest:'sha256:'+'c'.repeat(64)}),secret})
  await reconcileRuntimeDriftIncident({store,attestation:bad,secret})
  const green=buildRuntimeAttestation({identity:identity({}),secret})
  const result=await reconcileRuntimeDriftIncident({store,attestation:green,secret})
  assert.equal(result.state,'GREEN')
  assert.equal(result.resolved,true)
  assert.equal(activeRuntimeDriftIncidents(store).length,0)
  assert.equal(result.incident.resolutionCode,'RUNTIME_IDENTITY_VERIFIED')
  assert.equal(result.incident.resolvedBy,'SYSTEM:runtime-identity-supervisor')
}))

test('missing verification secret cannot release an existing drift incident',()=>withStore(async store=>{
  const bad=buildRuntimeAttestation({identity:identity({authorizedCommitSha:'d'.repeat(40)}),secret})
  await reconcileRuntimeDriftIncident({store,attestation:bad,secret})
  const green=buildRuntimeAttestation({identity:identity({}),secret})
  const result=await reconcileRuntimeDriftIncident({store,attestation:green,secret:''})
  assert.equal(result.state,'HOLD')
  assert.match(result.verificationError,/SECRET_REQUIRED/)
  assert.equal(activeRuntimeDriftIncidents(store).length,1)
}))
