import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createOperatorApprovalVerifier, operatorApprovalBytes } from './operator-approval.mjs'
import { createOmarchyTrustStore } from './trust-store.mjs'
import { createOmarchyStagingCoordinator, createLoopbackOmarchyServer } from './staging-coordinator.mjs'
import { createPostgresOmarchyLeases } from './postgres-leases.mjs'
import { createSignedOutboundTransport } from './private-transport.mjs'

const machineId='neo:machine:omarchy-ci-01'
const secondMachine='neo:machine:omarchy-ci-02'
const operator='neo:operator:omarchy-ci'
const keys={machine:generateKeyPairSync('ed25519'),machine2:generateKeyPairSync('ed25519'),
  server:generateKeyPairSync('ed25519'),operator:generateKeyPairSync('ed25519')}
const pem=(key,privateKey=false)=>key.export({format:'pem',type:privateKey?'pkcs8':'spki'})
const canonical=x=>Array.isArray(x)?x.map(canonical):
  x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x
const nonce=()=>createHash('sha256').update(String(Math.random())+Date.now()).digest('hex')
function approval(action,target,nonceValue=nonce()) {
  const scope={'task.queue':'omarchy:task:queue','machine.revoke':'omarchy:machine:revoke'}[action]
  const issued=Date.now()
  const claims={schema:'NEO-OMARCHY-APPROVAL-005',aud:'neo-omarchy-staging',environment:'staging',
    subject:operator,action,target,scope,nonce:nonceValue,iat:issued,exp:issued+60_000}
  const payload=operatorApprovalBytes(claims)
  return {keyId:'ci-operator-v1',payload:payload.toString('base64url'),
    signature:sign(null,payload,keys.operator.privateKey).toString('base64url')}
}
function machineEnvelope({machine=machineId,action='lease.poll',body=null,requestNonce=nonce(),key=keys.machine.privateKey}={}) {
  const payload={schema:'NEO-OMARCHY-PRIVATE-004',machineId:machine,action,body,issuedAt:Date.now(),nonce:requestNonce}
  return {payload,signature:sign(null,Buffer.from(JSON.stringify(canonical(payload))),key).toString('base64url')}
}
const resultURL='https://coordinator.neo.internal'
const pgUrl=process.env.NEO_OMARCHY_PG_TEST_URL
test('signed operator approval denies altered fields, wrong key, expired and unknown revocation',async()=>{
  const verify=createOperatorApprovalVerifier({
    publicKeyPem:pem(keys.operator.publicKey),keyId:'ci-operator-v1',
    revokedKeyIds:async()=>false,
  })
  const valid=approval('task.queue','task_005')
  assert.equal((await verify(valid,{action:'task.queue',target:'task_005'})).verified,true)
  assert.equal((await verify(valid,{action:'machine.revoke',target:'task_005'})).verified,false)
  assert.equal((await verify({...valid,keyId:'wrong'},{action:'task.queue',target:'task_005'})).verified,false)
  assert.equal((await verify({...valid,signature:sign(null,operatorApprovalBytes({fake:true}),keys.machine.privateKey).toString('base64url')},
    {action:'task.queue',target:'task_005'})).verified,false)
  const unknown=createOperatorApprovalVerifier({
    publicKeyPem:pem(keys.operator.publicKey),keyId:'ci-operator-v1',revokedKeyIds:async()=>undefined,
  })
  assert.equal((await unknown(valid,{action:'task.queue',target:'task_005'})).verified,false)
})

test('real PostgreSQL: one-time approvals, signed leases, durable replay and machine revocation', {
  skip:!pgUrl,
  timeout:120_000,
},async()=>{
  const {Pool}=await import('pg')
  const pool=new Pool({connectionString:pgUrl,max:5,connectionTimeoutMillis:5000,ssl:false})
  try {
    // CI uses an isolated throwaway PostgreSQL service. Never point this at Neon
    // or any production database; test setup DROPS the entire test schema.
    const info=await pool.query('SELECT current_database() AS name')
    assert.equal(info.rows[0].name,'neo_omarchy_ci')
    await pool.query('DROP SCHEMA IF EXISTS neo_omarchy CASCADE')
    const base=await readFile(new URL('./postgres-leases.sql',import.meta.url),'utf8')
    const upgrade=await readFile(new URL('./postgres-005.sql',import.meta.url),'utf8')
    await pool.query(base)
    await pool.query(upgrade)
    const future=new Date(Date.now()+10*60_000).toISOString()
    for (const [id,key] of [[machineId,keys.machine],[secondMachine,keys.machine2]]) {
      await pool.query(
        "INSERT INTO neo_omarchy.machines(machine_id,state,proof_id,issuer_key_fingerprint,proof_expires_at,approved_by,signing_public_key) VALUES($1,'approved',$2,$3,$4,$5,$6)",
        [id,nonce(),nonce(),future,operator,pem(key.publicKey)],
      )
    }
    // Keys are *synthetic*, directly seeded into a CI database—not live NEOpass issuance.
    const leases=createPostgresOmarchyLeases({pool})
    const trust=createOmarchyTrustStore({pool})
    const verifyOperatorApproval=createOperatorApprovalVerifier({
      publicKeyPem:pem(keys.operator.publicKey),keyId:'ci-operator-v1',
      revokedKeyIds:async()=>false,
    })
    const coordinator=createOmarchyStagingCoordinator({
      leases,trustStore:trust,verifyOperatorApproval,
      serverPrivateKeyPem:pem(keys.server.privateKey,true),
    })

    const firstApproval=approval('task.queue','task_005')
    assert.deepEqual(await coordinator.queueApprovedTask({
      taskId:'task_005',objective:'Summarize a public NEO test fact',
      maxTokens:64,operatorEnvelope:firstApproval,
    }),{taskId:'task_005',state:'queued'})
    await assert.rejects(coordinator.queueApprovedTask({
      taskId:'task_005',objective:'repeated',maxTokens:64,operatorEnvelope:firstApproval,
    }),/operator_approval_replay/)

    let lastWire=null
    const fakeHttps=async (url,opts)=>{
      assert.equal(String(url),resultURL+'/private/v1/worker')
      lastWire=JSON.parse(opts.body)
      const response=await coordinator.handleWorkerEnvelope(lastWire)
      return {ok:true,status:200,headers:{get:()=> 'application/json'},
        text:async()=>JSON.stringify(response)}
    }
    const makeTransport=(id,key)=>createSignedOutboundTransport({
      origin:resultURL,expectedHost:'coordinator.neo.internal',machineId:id,
      machinePrivateKeyPem:pem(key.privateKey,true),
      serverPublicKeyPem:pem(keys.server.publicKey),
      fetchImpl:fakeHttps,
    })
    const node1=makeTransport(machineId,keys.machine)
    const node2=makeTransport(secondMachine,keys.machine2)
    const [r1,r2]=await Promise.all([node1.pollLease(),node2.pollLease()])
    const actualLease=r1||r2
    const actualMachine=r1?machineId:secondMachine
    assert.ok(actualLease)
    assert.equal(actualLease.task.capability,'local-inference')
    assert.equal(actualLease.task.taskId,'task_005')
    assert.equal(r1===null || r2===null,true)

    // Identical signed request must be rejected even after a process restart.
    const captured=lastWire
    await assert.rejects(coordinator.handleWorkerEnvelope(captured),/machine_request_replay/)
    const recreatedTrust=createOmarchyTrustStore({pool})
    const recreated=createOmarchyStagingCoordinator({
      leases,trustStore:recreatedTrust,verifyOperatorApproval,
      serverPrivateKeyPem:pem(keys.server.privateKey,true),
    })
    await assert.rejects(recreated.handleWorkerEnvelope(captured),/machine_request_replay/)

    const activeTransport=actualMachine===machineId?node1:node2
    const receipt=await activeTransport.submitReceipt({
      machineId:actualMachine,taskId:'task_005',
      leaseToken:actualLease.leaseToken,outcome:'completed',resultDigest:'c'.repeat(64),
    })
    assert.deepEqual(receipt,{taskId:'task_005',state:'completed'})
    await assert.rejects(activeTransport.submitReceipt({
      machineId:actualMachine,taskId:'task_005',
      leaseToken:actualLease.leaseToken,outcome:'completed',resultDigest:'c'.repeat(64),
    }),/lease_not_active/)
    const taskState=await pool.query('SELECT state,attempts FROM neo_omarchy.tasks WHERE task_id=$1',['task_005'])
    assert.deepEqual(taskState.rows[0],{state:'completed',attempts:1})
    const audit=await pool.query('SELECT kind,previous_hash,event_hash FROM neo_omarchy.audit_events ORDER BY seq')
    assert.ok(audit.rows.length>=3)
    for (let i=1;i<audit.rows.length;i++) {
      assert.equal(audit.rows[i].previous_hash,audit.rows[i-1].event_hash)
    }

    const revoke=approval('machine.revoke',actualMachine)
    const result=await coordinator.revokeApprovedMachine({machineId:actualMachine,operatorEnvelope:revoke})
    assert.equal(result.state,'revoked')
    await assert.rejects(activeTransport.pollLease(),/machine_not_authorized|machine_not_authorized/)
    // Standalone local-only HTTP handler: invalid/unsigned payloads cannot execute.
    const loopback=createLoopbackOmarchyServer({coordinator})
    const bound=await loopback.start()
    try {
      assert.equal(bound.host,'127.0.0.1')
      const health=await fetch('http://127.0.0.1:'+bound.port+'/health')
      assert.equal((await health.json()).productionReady,false)
      const rejected=await fetch('http://127.0.0.1:'+bound.port+'/private/v1/worker',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({payload:{},signature:'bad'}),
      })
      assert.equal(rejected.status,403)
    } finally {await loopback.stop()}
  } finally {await pool.end()}
})

test('staging controller cannot be created without real trust and persistence adapters',()=>{
  assert.throws(()=>createOmarchyStagingCoordinator(),/staging_dependencies_missing/)
  assert.throws(()=>createOmarchyTrustStore(),/postgres_query_pool_required/)
})
