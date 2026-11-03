// NEO-OMARCHY-003: in-memory, simulation-only worker enrollment and leasing.
// Deliberately no HTTP listener, no live NEOpass issuer trust, no production state.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const MACHINE_ID = /^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const TASK_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/
const HEX64 = /^[a-f0-9]{64}$/i
const GENESIS = '0'.repeat(64)
const CHALLENGE_TTL = 120_000
const LEASE_TTL = 30_000

const hash = value => createHash('sha256').update(value).digest('hex')
const clone = value => JSON.parse(JSON.stringify(value))
const invariant = (valid, code) => { if (!valid) throw new Error(code) }
const matchesDigest = (a, b) =>
  typeof a === 'string' && typeof b === 'string' &&
  HEX64.test(a) && HEX64.test(b) &&
  timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))

export function verifyAuditChain(events) {
  if (!Array.isArray(events)) return false
  let previousHash = GENESIS
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (!event || typeof event !== 'object' || Array.isArray(event)) return false
    const { index, at, type, data, prevHash, hash: recordedHash, ...extra } = event
    if (Object.keys(extra).length || index !== i + 1 || !Number.isFinite(at) ||
        typeof type !== 'string' || !data || typeof data !== 'object' ||
        Array.isArray(data) || prevHash !== previousHash) return false
    const canonical = JSON.stringify({ index, at, type, data, prevHash })
    if (!matchesDigest(recordedHash, hash('NEO-OMARCHY-003:' + canonical))) return false
    previousHash = recordedHash
  }
  return true
}

export function createOmarchyCoordinator({
  mode, verifyNEOpassProof, verifyOperatorApproval,
  now = () => Date.now(), random = size => randomBytes(size),
} = {}) {
  invariant(mode === 'simulation', 'simulation_only')
  invariant(typeof verifyNEOpassProof === 'function', 'neopass_verifier_required')
  invariant(typeof verifyOperatorApproval === 'function', 'operator_verifier_required')

  const pending = new Map()
  const machines = new Map()
  const tasks = new Map()
  const evidence = []
  const stamp = () => {
    const instant = now()
    invariant(Number.isSafeInteger(instant) && instant > 0, 'clock_invalid')
    return instant
  }
  function record(type, data) {
    const item = {
      index: evidence.length + 1,
      at: stamp(),
      type,
      data: clone(data),
      prevHash: evidence.length ? evidence[evidence.length - 1].hash : GENESIS,
    }
    item.hash = hash('NEO-OMARCHY-003:' + JSON.stringify(item))
    evidence.push(item)
  }
  function sweep() {
    const current = stamp()
    for (const task of tasks.values()) {
      if (task.state === 'leased' && current >= task.expiresAt) {
        task.state = 'needs-review'
        task.leaseHash = null
        record('task.lease_expired', { taskId: task.taskId, machineId: task.machineId })
      }
    }
    for (const [id, challenge] of pending) {
      if (current >= challenge.expiresAt) pending.delete(id)
    }
  }
  async function approve(action, target, evidenceProof, scope) {
    const result = await verifyOperatorApproval({ action, target, proof: evidenceProof })
    invariant(result?.verified === true && result?.action === action &&
      result?.target === target && result?.scope === scope &&
      typeof result?.subject === 'string' &&
      /^neo:operator:[a-z0-9][a-z0-9._-]{0,63}$/.test(result.subject) &&
      Number.isSafeInteger(result.expiresAt) && result.expiresAt > stamp(),
      'operator_approval_unverified')
    return result.subject
  }
  function requireMachine(machineId) {
    invariant(MACHINE_ID.test(machineId || ''), 'invalid_machine_id')
    const entry = machines.get(machineId)
    invariant(entry?.state === 'approved', 'machine_not_approved')
    return entry
  }
  return {
    startEnrollment({ machineId }) {
      invariant(MACHINE_ID.test(machineId || ''), 'invalid_machine_id')
      invariant(!machines.has(machineId) && !pending.has(machineId), 'already_registered')
      invariant(pending.size < 64, 'challenge_capacity_reached')
      const nonce = random(32).toString('hex')
      invariant(HEX64.test(nonce), 'invalid_nonce_entropy')
      pending.set(machineId, { hash: hash(nonce), expiresAt: stamp() + CHALLENGE_TTL })
      record('machine.challenge', { machineId })
      return { machineId, nonce, audience: 'neo-omarchy-003', expiresAt: pending.get(machineId).expiresAt }
    },
    async enroll({ machineId, nonce, proof }) {
      invariant(MACHINE_ID.test(machineId || ''), 'invalid_machine_id')
      const challenge = pending.get(machineId)
      invariant(challenge && stamp() < challenge.expiresAt &&
        matchesDigest(hash(nonce || ''), challenge.hash), 'challenge_invalid')
      // One-time challenge is consumed BEFORE contacting the external verifier.
      pending.delete(machineId)
      const verified = await verifyNEOpassProof({ machineId, nonce, proof, audience: 'neo-omarchy-003' })
      invariant(verified?.verified === true && verified?.issuer === 'NEOpass' &&
        verified?.machineId === machineId && verified?.nonce === nonce &&
        verified?.audience === 'neo-omarchy-003' &&
        Number.isSafeInteger(verified.expiresAt) && verified.expiresAt > stamp(),
        'neopass_attestation_unverified')
      machines.set(machineId, { machineId, state: 'pending_operator_approval',
        credentialExpiresAt: verified.expiresAt, scopes: [] })
      record('machine.attestation_accepted', { machineId, state: 'pending_operator_approval' })
      return { machineId, state: 'pending_operator_approval' }
    },
    async approveMachine({ machineId, approval }) {
      invariant(machines.get(machineId)?.state === 'pending_operator_approval', 'approval_state_invalid')
      invariant(machines.get(machineId).credentialExpiresAt > stamp(), 'attestation_expired')
      const actor = await approve('machine.approve', machineId, approval, 'omarchy:machine:approve')
      const machine = machines.get(machineId)
      machine.state = 'approved'
      machine.scopes = ['local-inference']
      record('machine.approved', { machineId, actor, scopes: ['local-inference'] })
      return { machineId, state: 'approved', scopes: ['local-inference'] }
    },
    async queueTask({ taskId, objective, maxTokens = 256, approval }) {
      invariant(TASK_ID.test(taskId || ''), 'invalid_task_id')
      invariant(!tasks.has(taskId) && tasks.size < 128, 'task_already_exists_or_full')
      invariant(typeof objective === 'string' && objective.trim() &&
        objective.length <= 2000, 'invalid_task_objective')
      invariant(Number.isInteger(maxTokens) && maxTokens >= 1 && maxTokens <= 512, 'invalid_token_limit')
      const actor = await approve('task.queue', taskId, approval, 'omarchy:task:queue')
      tasks.set(taskId, { taskId, objective, maxTokens, state: 'queued',
        machineId: null, leaseHash: null, expiresAt: null, attempts: 0 })
      record('task.queued', { taskId, actor, scope: 'local-inference' })
      return { taskId, state: 'queued', scope: 'local-inference' }
    },
    leaseNext({ machineId }) {
      sweep()
      const machine = requireMachine(machineId)
      invariant(machine.credentialExpiresAt > stamp(), 'attestation_expired')
      invariant(machine.scopes.includes('local-inference'), 'scope_denied')
      invariant(![...tasks.values()].some(t => t.machineId === machineId && t.state === 'leased'),
        'machine_already_leased')
      const task = [...tasks.values()].find(t => t.state === 'queued')
      if (!task) return null
      const leaseToken = random(32).toString('hex')
      invariant(HEX64.test(leaseToken), 'invalid_lease_entropy')
      task.state = 'leased'
      task.machineId = machineId
      task.attempts++
      task.leaseHash = hash(leaseToken)
      task.expiresAt = stamp() + LEASE_TTL
      record('task.leased', { taskId: task.taskId, machineId, attempt: task.attempts,
        expiresAt: task.expiresAt })
      return {
        machineId,
        leaseToken,
        expiresAt: task.expiresAt,
        task: {
          taskId: task.taskId,
          capability: 'local-inference',
          objective: task.objective,
          maxTokens: task.maxTokens,
        },
      }
    },
    complete({ machineId, taskId, leaseToken, outcome, resultDigest }) {
      sweep()
      requireMachine(machineId)
      const task = tasks.get(taskId)
      invariant(task?.state === 'leased' && task.machineId === machineId, 'lease_not_active')
      invariant(matchesDigest(hash(leaseToken || ''), task.leaseHash), 'lease_token_invalid')
      invariant(['completed', 'failed'].includes(outcome) && HEX64.test(resultDigest || ''), 'invalid_result')
      task.state = outcome
      task.leaseHash = null
      record('task.completed', { taskId, machineId, outcome, resultDigest: resultDigest.toLowerCase() })
      return { taskId, state: outcome }
    },
    async revokeMachine({ machineId, approval }) {
      invariant(machines.has(machineId), 'machine_not_registered')
      const actor = await approve('machine.revoke', machineId, approval, 'omarchy:machine:revoke')
      machines.get(machineId).state = 'revoked'
      for (const task of tasks.values()) {
        if (task.machineId === machineId && task.state === 'leased') {
          task.state = 'needs-review'
          task.leaseHash = null
          record('task.quarantined', { taskId: task.taskId, machineId })
        }
      }
      pending.delete(machineId)
      record('machine.revoked', { machineId, actor })
      return { machineId, state: 'revoked' }
    },
    status() {
      sweep()
      return {
        mode: 'simulation', productionReady: false,
        machines: [...machines.values()].map(m => ({
          machineId: m.machineId, state: m.state, scopes: [...m.scopes],
        })),
        tasks: [...tasks.values()].map(t => ({
          taskId: t.taskId, state: t.state, machineId: t.machineId, attempts: t.attempts,
        })),
      }
    },
    exportEvidence() {
      sweep()
      return {
        schema: 'NEO-OMARCHY-EVIDENCE-003',
        simulated: true, blockchainAnchorVerified: false,
        neOpassProductionVerified: false, signedByWitness: false,
        events: clone(evidence),
      }
    },
    verifyEvidence() { return verifyAuditChain(evidence) },
  }
}
