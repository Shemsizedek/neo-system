import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, verify } from 'node:crypto'
import { createPinnedNEOpassVerifier, machineProofPayload } from './neopass-proof.mjs'
import { createSignedOutboundTransport, validatePrivateOrigin } from './private-transport.mjs'
import { signOmarchyEvidence, verifyOmarchyEvidence } from './signed-evidence.mjs'
import { createPostgresOmarchyLeases } from './postgres-leases.mjs'

const clock = 1_800_000_000_000
const machineId = 'neo:machine:omarchy-node-01'
const issuer = 'neopass:verified-machine-authority'
const signerId = 'neo:operator:lab-reviewer'
const issuerKeys = generateKeyPairSync('ed25519')
const machineKeys = generateKeyPairSync('ed25519')
const serverKeys = generateKeyPairSync('ed25519')
const getPem = (key, kind = 'public') => key.export({
  format: 'pem', type: kind === 'public' ? 'spki' : 'pkcs8',
})
const decision = (action, target) => ({
  verified: true, action, target, subject: signerId, expiresAt: clock + 60_000,
})
function machineClaims(override = {}) {
  return {
    aud: 'neo-omarchy-machine-v1', exp: clock + 120_000,
    iat: clock - 1000, iss: issuer, jti: 'a'.repeat(64),
    nonce: 'b'.repeat(64), scope: 'omarchy:machine:enroll',
    sub: machineId, ...override,
  }
}
function signedProof(claims = machineClaims()) {
  const payload = machineProofPayload(claims)
  return { algorithm: 'Ed25519', keyId: 'neopass-k1',
    payload: payload.toString('base64url'),
    signature: sign(null, payload, issuerKeys.privateKey).toString('base64url') }
}
test('cryptographic NEOpass verifier requires pinned real Ed25519 public key and revocation query', () => {
  assert.throws(() => createPinnedNEOpassVerifier(), /configuration/)
  assert.throws(() => createPinnedNEOpassVerifier({
    issuer, keyId: 'key', publicKeyPem: 'garbage', isRevoked: async () => false,
  }), /ed25519/)
})

test('signed machine proof verifies only exact issuer, machine, nonce, audience, expiry', async () => {
  const verifier = createPinnedNEOpassVerifier({
    issuer, keyId: 'neopass-k1', publicKeyPem: getPem(issuerKeys.publicKey),
    now: () => clock, isRevoked: async () => false,
  })
  const ok = await verifier({ machineId, nonce: 'b'.repeat(64), proof: signedProof() })
  assert.equal(ok.verified, true)
  assert.equal(ok.issuer, 'NEOpass')
  assert.match(ok.keyFingerprint, /^[a-f0-9]{64}$/)
  for (const claims of [
    machineClaims({ iss: 'neopass:attacker' }),
    machineClaims({ sub: 'neo:machine:another' }),
    machineClaims({ nonce: 'c'.repeat(64) }),
    machineClaims({ aud: 'different' }),
    machineClaims({ exp: clock }),
    machineClaims({ exp: clock + 400_000 }),
    machineClaims({ scope: 'shell.execute' }),
    machineClaims({ iat: clock + 60_000 }),
    machineClaims({ extra: 'unauthorized' }),
  ]) assert.equal((await verifier({ machineId, nonce: 'b'.repeat(64), proof: signedProof(claims) })).verified, false)
  const wrongKey = { ...signedProof(), signature: sign(null, machineProofPayload(machineClaims()), machineKeys.privateKey).toString('base64url') }
  assert.equal((await verifier({ machineId, nonce: 'b'.repeat(64), proof: wrongKey })).verified, false)
  const revoked = createPinnedNEOpassVerifier({
    issuer, keyId: 'neopass-k1', publicKeyPem: getPem(issuerKeys.publicKey),
    now: () => clock, isRevoked: async () => true,
  })
  assert.equal((await revoked({ machineId, nonce: 'b'.repeat(64), proof: signedProof() })).verified, false)
})

test('private worker transport rejects public, non-TLS, and credentialed endpoints', () => {
  for (const url of ['http://coordinator.neo.internal','https://example.com',
    'https://user:pass@coordinator.neo.internal','https://coordinator.neo.internal/other',
    'https://coordinator.neo.internal:8443','https://coordinator.neo.internal?token=a']) {
    assert.equal(validatePrivateOrigin(url, 'coordinator.neo.internal'), false)
  }
  assert.equal(validatePrivateOrigin('https://coordinator.neo.internal','coordinator.neo.internal'), true)
})

test('signed private transport authenticates request and response without a listener', async () => {
  let calls = 0
  const privatePem = getPem(machineKeys.privateKey, 'private')
  const verifyRequest = (statement, signature) => verify(null,
    Buffer.from(JSON.stringify(Object.fromEntries(Object.keys(statement).sort().map(k => [k, statement[k]])))),
    machineKeys.publicKey, Buffer.from(signature, 'base64url'))
  const fetchImpl = async (url, options) => {
    calls++
    assert.equal(String(url), 'https://coordinator.neo.internal/private/v1/worker')
    assert.equal(options.method, 'POST')
    assert.equal(options.redirect, 'error')
    const {payload,signature} = JSON.parse(options.body)
    assert.equal(verifyRequest(payload, signature), true)
    assert.equal(payload.machineId, machineId)
    const outgoing = {
      action: payload.action, body: payload.action === 'lease.poll' ? null : { taskId: payload.body.taskId, state: payload.body.outcome },
      expiresAt: clock + 5000, issuedAt: clock, machineId,
      requestNonce: payload.nonce, schema: 'NEO-OMARCHY-PRIVATE-004',
    }
    const canonical = Object.fromEntries(Object.keys(outgoing).sort().map(k => [k, outgoing[k]]))
    const envelope = { payload: outgoing,
      signature: sign(null, Buffer.from(JSON.stringify(canonical)), serverKeys.privateKey).toString('base64url') }
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      text: async () => JSON.stringify(envelope) }
  }
  const transport = createSignedOutboundTransport({
    origin: 'https://coordinator.neo.internal', expectedHost: 'coordinator.neo.internal',
    machineId, machinePrivateKeyPem: privatePem,
    serverPublicKeyPem: getPem(serverKeys.publicKey), now: () => clock, fetchImpl,
  })
  assert.equal(await transport.pollLease(), null)
  assert.deepEqual(await transport.submitReceipt({
    machineId, taskId: 'task1', leaseToken: 'a'.repeat(64),
    outcome: 'completed', resultDigest: 'b'.repeat(64),
  }), {taskId:'task1',state:'completed'})
  await assert.rejects(transport.submitReceipt({
    machineId:'neo:machine:other',taskId:'task1',
    leaseToken: 'a'.repeat(64),outcome:'completed',resultDigest:'b'.repeat(64),
  }), /machine_identity_mismatch/)
  assert.equal(calls, 2)
})

test('invalid server signature and request schema fail closed', async () => {
  const config = {
    origin:'https://coordinator.neo.internal',expectedHost:'coordinator.neo.internal',
    machineId, machinePrivateKeyPem:getPem(machineKeys.privateKey,'private'),
    serverPublicKeyPem:getPem(serverKeys.publicKey),now:()=>clock,
  }
  const transport = createSignedOutboundTransport({ ...config,
    fetchImpl: async () => ({ ok: true, status: 200, headers: {get:()=> 'application/json'},
      text:async()=>JSON.stringify({payload:{}, signature:'bad'}) }),
  })
  await assert.rejects(transport.pollLease(), /attestation_invalid/)
  await assert.rejects(transport.submitReceipt({
    machineId, taskId:'task1', leaseToken:'x',
    outcome:'completed',resultDigest:'b'.repeat(64),
  }), /schema_rejected/)
})

test('operator-signed receipt verifies but cannot claim witness or blockchain anchor', () => {
  const signed = signOmarchyEvidence({
    eventHash: 'a'.repeat(64), previousHash: '0'.repeat(64),
    signerId, signerKeyId:'operator-k1',
    privateKeyPem: getPem(machineKeys.privateKey,'private'), signedAt:clock,
  })
  const config = {trustedSignerId:signerId, trustedKeyId:'operator-k1',publicKeyPem:getPem(machineKeys.publicKey)}
  assert.equal(verifyOmarchyEvidence({receipt:signed,...config}), true)
  assert.equal(signed.blockchainAnchorVerified, false)
  assert.equal(signed.independentlyWitnessed, false)
  assert.equal(verifyOmarchyEvidence({receipt:{...signed,independentlyWitnessed:true},...config}), false)
  assert.equal(verifyOmarchyEvidence({receipt:{...signed,payload:{...signed.payload,eventHash:'c'.repeat(64)}},...config}), false)
  assert.equal(verifyOmarchyEvidence({receipt:signed,...config, trustedKeyId:'wrong'}), false)
})

function mockPool() {
  const calls = []
  let released = 0
  const rows = {
    machines: new Map(), tasks: new Map(), audit: [],
  }
  const query = async (sql, params = []) => {
    calls.push({sql,params})
    const s=sql.replace(/\s+/g,' ').trim()
    if (['BEGIN','COMMIT','ROLLBACK'].includes(s) || s.includes('pg_advisory_xact_lock')) return {rows:[]}
    if (s.startsWith('SELECT event_hash')) return {rows:rows.audit.length?[{event_hash:rows.audit.at(-1).event_hash}]:[]}
    if (s.startsWith('INSERT INTO neo_omarchy.audit_events')) {
      rows.audit.push({event_hash:params[4]}); return {rows:[]}
    }
    if (s.startsWith('INSERT INTO neo_omarchy.machines')) {
      rows.machines.set(params[0], {state:'approved',proof_expires_at:params[3]}); return {rows:[]}
    }
    if (s.startsWith('INSERT INTO neo_omarchy.tasks')) {
      rows.tasks.set(params[0], {task_id:params[0], objective:params[1],max_tokens:params[2],state:'queued'});return {rows:[]}
    }
    if (s.includes("UPDATE neo_omarchy.tasks SET state='needs-review'") && s.includes('lease_expires_at')) return {rows:[]}
    if (s.startsWith('SELECT state,proof_expires_at')) {
      const m=rows.machines.get(params[0]);return {rows:m?[m]:[]}
    }
    if (s.startsWith('SELECT task_id FROM neo_omarchy.tasks WHERE machine_id')) {
      return {rows:[...rows.tasks.values()].filter(t=>t.machine_id===params[0]&&t.state==='leased').map(t=>({task_id:t.task_id}))}
    }
    if (s.startsWith('SELECT task_id,objective,max_tokens')) {
      return {rows:[...rows.tasks.values()].filter(t=>t.state==='queued').slice(0,1)}
    }
    if (s.startsWith("UPDATE neo_omarchy.tasks SET state='leased'")) {
      const t=rows.tasks.get(params[3]);Object.assign(t,{state:'leased',machine_id:params[0],lease_hash:params[1],lease_expires_at:params[2]});return {rows:[]}
    }
    if (s.startsWith('SELECT state,machine_id,lease_hash')) {
      const t=rows.tasks.get(params[0]);return {rows:t?[t]:[]}
    }
    if (s.startsWith('UPDATE neo_omarchy.tasks SET state=$1')) {
      const t=rows.tasks.get(params[2]);Object.assign(t,{state:params[0],result_digest:params[1]});return {rows:[]}
    }
    if (s.startsWith("UPDATE neo_omarchy.machines SET state='revoked'")) {
      const t=rows.machines.get(params[0]);if(t){t.state='revoked';return {rows:[{machine_id:params[0]}]}}return {rows:[]}
    }
    if (s.startsWith("UPDATE neo_omarchy.tasks SET state='needs-review'")) {
      return {rows:[]}
    }
    throw new Error('unexpected_sql:'+s)
  }
  return { calls,rows, get released(){return released},connect:async()=>({query,release:()=>{released++}}) }
}

test('Postgres pilot store uses serialized parameterized transactions and accepts receipt once', async () => {
  const pool=mockPool()
  const store=createPostgresOmarchyLeases({pool,now:()=>clock})
  await store.registerMachine({machineId,proof:{
    verified:true,machineId,proofId:'a'.repeat(64),keyFingerprint:'b'.repeat(64),expiresAt:clock+100000,
  },decision:decision('machine.approve',machineId)})
  await store.enqueue({taskId:'task1',objective:'Summarize public system documentation',
    decision:decision('task.queue','task1')})
  const lease=await store.leaseNext({machineId})
  assert.equal(lease.task.capability,'local-inference')
  assert.equal(lease.task.taskId,'task1')
  const receipt=await store.complete({
    machineId, taskId:'task1',leaseToken:lease.leaseToken,
    outcome:'completed',resultDigest:'b'.repeat(64),
  })
  assert.equal(receipt.state,'completed')
  await assert.rejects(store.complete({
    machineId,taskId:'task1',leaseToken:lease.leaseToken,
    outcome:'completed',resultDigest:'b'.repeat(64),
  }), /lease_not_active/)
  assert.ok(pool.calls.some(x=>x.sql==='SELECT pg_advisory_xact_lock(4204, 4)'))
  assert.ok(pool.calls.some(x=>x.sql==='ROLLBACK'))
  assert.ok(pool.calls.some(x=>x.sql==='COMMIT'))
  assert.ok(pool.calls.filter(x=>x.sql.includes('INSERT')).every(x=>x.sql.includes('$1')))
  assert.equal(pool.released,pool.calls.filter(x=>x.sql==='BEGIN').length)
})

test('Postgres store denies self-approved tasks and unknown machines', async () => {
  const pool=mockPool()
  const store=createPostgresOmarchyLeases({pool,now:()=>clock})
  await assert.rejects(store.enqueue({taskId:'bad',objective:'x',decision:{ verified:true }}),/authorization_invalid/)
  await assert.rejects(store.leaseNext({machineId}),/machine_not_authorized/)
  assert.equal(pool.released,1)
})
