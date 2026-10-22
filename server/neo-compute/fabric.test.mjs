import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {createEnrollmentChallenge,buildAttestationPayload,verifyEnrollmentAttestation,createNodeRecord,applyHeartbeat,capacityFits,scheduleWorkload,buildClusterState,publicEstateSnapshot} from './fabric.mjs'

test('node enrollment requires valid ed25519 attestation',()=>{
  const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519')
  const challenge=createEnrollmentChallenge({nodeId:'node-1',ttlSeconds:300})
  const payload=buildAttestationPayload({challenge,hardware:{platform:'linux',arch:'arm64'},capacity:{cpu_cores:4,memory_mb:8192,storage_gb:120}})
  const signature=crypto.sign(null,Buffer.from(JSON.stringify(payload)),privateKey).toString('base64')
  assert.equal(verifyEnrollmentAttestation({challenge,payload,signature,publicKey}).valid,true)
})

test('heartbeat promotes attested healthy node to eligible',()=>{
  const node=createNodeRecord({payload:{node_id:'node-1',hardware:{},capacity:{cpu_cores:4,memory_mb:4096,storage_gb:100}}})
  const next=applyHeartbeat(node,{health:'HEALTHY'})
  assert.equal(next.state,'ELIGIBLE')
})

test('scheduler refuses production placement without approval',()=>{
  const node=applyHeartbeat(createNodeRecord({payload:{node_id:'n',hardware:{},capacity:{cpu_cores:8,memory_mb:16384,storage_gb:500}}}),{health:'HEALTHY'})
  const workload={workload_id:'neo-edge',requirements:{cpu_cores:2,memory_mb:2048,storage_gb:10}}
  assert.equal(scheduleWorkload({workload,nodes:[node],production:true,approved:false}).status,'AWAITING_APPROVAL')
  assert.equal(scheduleWorkload({workload,nodes:[node],production:false}).status,'SHADOW_PLACEMENT')
})

test('capacity registry enforces fit',()=>{
  const node=createNodeRecord({payload:{node_id:'n',hardware:{},capacity:{cpu_cores:2,memory_mb:2048,storage_gb:20}}})
  assert.equal(capacityFits(node,{cpu_cores:1,memory_mb:1024,storage_gb:10}),true)
  assert.equal(capacityFits(node,{cpu_cores:4,memory_mb:1024,storage_gb:10}),false)
})

test('estate snapshot remains operational, not legal validation',()=>{
  const snap=publicEstateSnapshot({nodes:[]})
  assert.equal(snap.estate,'Global Vast Estate')
  assert.match(snap.legal_boundary,/does not independently establish legal trust validity/)
  assert.equal(buildClusterState([]).state,'EMPTY')
})
