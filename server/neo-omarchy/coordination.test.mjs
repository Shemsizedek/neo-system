import test from 'node:test'
import assert from 'node:assert/strict'
import { createOmarchyCoordinator, verifyAuditChain } from './coordination.mjs'
import { createOutboundOmarchyWorker, validateLease } from './outbound-worker.mjs'

let current = 1_800_000_000_000
const clock = () => current
const machineId = 'neo:machine:omarchy-node-01'
const otherMachineId = 'neo:machine:omarchy-node-02'
const operator = 'neo:operator:test-operator'
const token = 'b'.repeat(64)
const approval = 'authorized'
const verifier = async ({ machineId: id, nonce, proof, audience }) =>
  proof === 'valid'
    ? { verified: true, issuer: 'NEOpass', machineId: id, nonce, audience, expiresAt: clock() + 600_000 }
    : { verified: false }
const operatorVerifier = async ({ action, target, proof }) =>
  proof === approval
    ? { verified: true, action, target, scope: {
        'machine.approve': 'omarchy:machine:approve',
        'machine.revoke': 'omarchy:machine:revoke',
        'task.queue': 'omarchy:task:queue',
      }[action], subject: operator, expiresAt: clock() + 120_000 }
    : { verified: false }

function coordinator() {
  return createOmarchyCoordinator({
    mode: 'simulation',
    verifyNEOpassProof: verifier,
    verifyOperatorApproval: operatorVerifier,
    now: clock,
  })
}
async function enrollAndApprove(engine, id = machineId) {
  const { nonce } = engine.startEnrollment({ machineId: id })
  await engine.enroll({ machineId: id, nonce, proof: 'valid' })
  return engine.approveMachine({ machineId: id, approval })
}
async function queue(engine, taskId = 'task_001') {
  return engine.queueTask({ taskId, objective: 'Summarize public NEO architecture', maxTokens: 64, approval })
}

test('simulation is explicit and external issuer/approval verifiers are mandatory', () => {
  assert.throws(() => createOmarchyCoordinator(), /simulation_only/)
  assert.throws(() => createOmarchyCoordinator({ mode: 'simulation' }), /neopass_verifier_required/)
  assert.throws(() => createOmarchyCoordinator({ mode: 'simulation', verifyNEOpassProof: verifier }), /operator_verifier_required/)
})

test('one-use NEOpass nonce; forged/expired assertions cannot enroll', async () => {
  current = 1_800_000_000_000
  const engine = coordinator()
  const challenge = engine.startEnrollment({ machineId })
  await assert.rejects(engine.enroll({ machineId, nonce: 'a'.repeat(64), proof: 'valid' }), /challenge_invalid/)
  await assert.rejects(engine.enroll({ machineId, nonce: challenge.nonce, proof: 'invalid' }), /neopass_attestation_unverified/)
  await assert.rejects(engine.enroll({ machineId, nonce: challenge.nonce, proof: 'valid' }), /challenge_invalid/)
  const other = engine.startEnrollment({ machineId: otherMachineId })
  current += 120_001
  await assert.rejects(engine.enroll({ machineId: otherMachineId, nonce: other.nonce, proof: 'valid' }), /challenge_invalid/)
  assert.equal(engine.status().machines.length, 0)
})

test('NEOpass proof never skips distinct operator authorization', async () => {
  current = 1_800_000_000_000
  const engine = coordinator()
  const challenge = engine.startEnrollment({ machineId })
  const enrolled = await engine.enroll({ machineId, nonce: challenge.nonce, proof: 'valid' })
  assert.equal(enrolled.state, 'pending_operator_approval')
  await assert.rejects(engine.approveMachine({ machineId, approval: 'unauthorized' }), /operator_approval_unverified/)
  await assert.rejects(async () => engine.leaseNext({ machineId }), /machine_not_approved/)
  const approved = await engine.approveMachine({ machineId, approval })
  assert.deepEqual(approved.scopes, ['local-inference'])
  assert.equal(engine.status().productionReady, false)
})

test('only approved local-inference jobs are leased; no duplicate issuance', async () => {
  current = 1_800_000_000_000
  const engine = coordinator()
  await enrollAndApprove(engine)
  await assert.rejects(engine.queueTask({ taskId: 'x', objective: 'good', approval: 'nope' }), /operator_approval_unverified/)
  await queue(engine)
  const lease = engine.leaseNext({ machineId })
  assert.equal(lease.task.capability, 'local-inference')
  assert.equal(lease.task.maxTokens, 64)
  assert.deepEqual(Object.keys(lease.task), ['taskId', 'capability', 'objective', 'maxTokens'])
  assert.throws(() => engine.leaseNext({ machineId }), /machine_already_leased/)
  assert.throws(() => engine.complete({ machineId, taskId: 'task_001',
    leaseToken: 'f'.repeat(64), outcome: 'completed', resultDigest: 'e'.repeat(64) }), /lease_token_invalid/)
  assert.throws(() => engine.complete({ machineId: otherMachineId, taskId: 'task_001',
    leaseToken: lease.leaseToken, outcome: 'completed', resultDigest: 'e'.repeat(64) }), /machine_not_approved/)
  const completed = engine.complete({ machineId, taskId: 'task_001', leaseToken: lease.leaseToken,
    outcome: 'completed', resultDigest: 'e'.repeat(64) })
  assert.equal(completed.state, 'completed')
  assert.throws(() => engine.complete({ machineId, taskId: 'task_001',
    leaseToken: lease.leaseToken, outcome: 'completed', resultDigest: 'e'.repeat(64) }), /lease_not_active/)
  assert.equal(engine.leaseNext({ machineId }), null)
})

test('expired lease is quarantined, never automatically reissued', async () => {
  current = 1_800_000_000_000
  const engine = coordinator()
  await enrollAndApprove(engine)
  await queue(engine)
  const lease = engine.leaseNext({ machineId })
  current += 30_001
  assert.throws(() => engine.complete({ machineId, taskId: 'task_001', leaseToken: lease.leaseToken,
    outcome: 'completed', resultDigest: 'e'.repeat(64) }), /lease_not_active/)
  assert.equal(engine.leaseNext({ machineId }), null)
  assert.equal(engine.status().tasks[0].state, 'needs-review')
})

test('revocation quarantines outstanding leases and blocks future execution', async () => {
  current = 1_800_000_000_000
  const engine = coordinator()
  await enrollAndApprove(engine)
  await queue(engine)
  engine.leaseNext({ machineId })
  await engine.revokeMachine({ machineId, approval })
  assert.equal(engine.status().tasks[0].state, 'needs-review')
  assert.throws(() => engine.leaseNext({ machineId }), /machine_not_approved/)
})

test('outbound-only worker accepts scoped lease; submits hash receipt without content', async () => {
  current = 1_800_000_000_000
  const engine = coordinator()
  await enrollAndApprove(engine)
  await queue(engine)
  let count = 0
  const worker = createOutboundOmarchyWorker({
    machineId, now: clock,
    pollLease: async ({ machineId: id }) => engine.leaseNext({ machineId: id }),
    invokeLocalInference: async request => {
      count++
      assert.equal(request.capability, 'local-inference')
      return { text: 'synthetic response', model: 'test' }
    },
    submitReceipt: async receipt => engine.complete(receipt),
  })
  assert.equal((await worker.runOnce()).status, 'completed')
  assert.equal((await worker.runOnce()).status, 'idle')
  assert.equal(count, 1)
  const exported = engine.exportEvidence()
  assert.equal(exported.simulated, true)
  assert.equal(exported.blockchainAnchorVerified, false)
  assert.equal(verifyAuditChain(exported.events), true)
  const serialized = JSON.stringify(exported)
  assert.equal(serialized.includes('Summarize public NEO architecture'), false)
  assert.equal(serialized.includes('synthetic response'), false)
  assert.equal(serialized.includes('valid'), false)
})

test('audit tampering is detected and snapshots are detached copies', async () => {
  current = 1_800_000_000_000
  const engine = coordinator()
  await enrollAndApprove(engine)
  const first = engine.exportEvidence()
  assert.ok(first.events.length >= 3)
  first.events[0].type = 'machine.forged'
  assert.equal(verifyAuditChain(first.events), false)
  assert.equal(engine.verifyEvidence(), true)
  assert.equal(engine.exportEvidence().events[0].type, 'machine.challenge')
})

test('rejects adversarial leases, no inference callback or privileged action executes', async () => {
  current = 1_800_000_000_000
  const baseLease = {
    machineId, leaseToken: token, expiresAt: current + 10000,
    task: { taskId: 'test', capability: 'local-inference', objective: 'hello', maxTokens: 32 },
  }
  for (const candidate of [
    { ...baseLease, command: 'rm -rf /' },
    { ...baseLease, expiresAt: current + 30001 },
    { ...baseLease, machineId: otherMachineId },
    { ...baseLease, task: { ...baseLease.task, tools: ['shell'] } },
    { ...baseLease, task: { ...baseLease.task, capability: 'tool-use' } },
    { ...baseLease, task: { ...baseLease.task, objective: ' ' } },
  ]) assert.equal(validateLease(machineId, candidate, current), false)
  let calls = 0
  const worker = createOutboundOmarchyWorker({
    machineId, now: clock,
    pollLease: async () => ({ ...baseLease, task: { ...baseLease.task, actions: ['transaction'] } }),
    invokeLocalInference: async () => { calls++; return { text: 'never' } },
    submitReceipt: async () => { calls++; return null },
  })
  await assert.rejects(worker.runOnce(), /untrusted_lease_rejected/)
  assert.equal(calls, 0)
})
