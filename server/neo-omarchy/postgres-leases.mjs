// NEO-OMARCHY-004: SQL transaction-backed, single-pilot-node lease repository.
// No automatic database connectivity; use an operator-provided, restricted pool.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
const MACHINE = /^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const TASK = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const HEX64 = /^[0-9a-f]{64}$/i
const zero = '0'.repeat(64)
const sha = x => createHash('sha256').update(x).digest('hex')
const requireThat = (condition, error) => { if (!condition) throw new Error(error) }
const sameDigest = (a, b) => HEX64.test(a || '') && HEX64.test(b || '') &&
  timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
function acceptedDecision(decision, action, target, nowMs) {
  return decision?.verified === true && decision.action === action && decision.target === target &&
    /^neo:operator:[a-z0-9][a-z0-9._-]{0,63}$/.test(decision.subject || '') &&
    Number.isSafeInteger(decision.expiresAt) && decision.expiresAt > nowMs
}
export function createPostgresOmarchyLeases({ pool, now = () => Date.now(), random = n => randomBytes(n) } = {}) {
  requireThat(pool && typeof pool.connect === 'function', 'restricted_postgres_pool_required')
  function timestamp() {
    const ms = now()
    requireThat(Number.isSafeInteger(ms) && ms > 0, 'clock_invalid')
    return ms
  }
  async function transaction(callback) {
    const client = await pool.connect()
    requireThat(typeof client?.query === 'function' && typeof client?.release === 'function', 'invalid_pg_client')
    let active = false
    try {
      await client.query('BEGIN')
      active = true
      // Serialize all pilot writes and audit updates; not a multi-region solution.
      await client.query('SELECT pg_advisory_xact_lock(4204, 4)')
      const result = await callback(client)
      await client.query('COMMIT')
      active = false
      return result
    } catch (error) {
      if (active) { try { await client.query('ROLLBACK') } catch {} }
      throw error
    } finally { client.release() }
  }
  async function audit(client, kind, subjectId, metadata) {
    const prior = await client.query('SELECT event_hash FROM neo_omarchy.audit_events ORDER BY seq DESC LIMIT 1')
    const previous = prior.rows?.[0]?.event_hash || zero
    const body = { kind, subjectId, metadata, previous }
    const digest = sha('NEO-OMARCHY-004:' + JSON.stringify(body))
    await client.query(
      'INSERT INTO neo_omarchy.audit_events(kind,subject_id,metadata_json,previous_hash,event_hash) VALUES($1,$2,$3::jsonb,$4,$5)',
      [kind, subjectId, JSON.stringify(metadata), previous, digest],
    )
  }
  async function expire(client, atMs) {
    const rows = await client.query(
      "UPDATE neo_omarchy.tasks SET state='needs-review',lease_hash=NULL WHERE state='leased' AND lease_expires_at <= $1 RETURNING task_id,machine_id",
      [new Date(atMs).toISOString()],
    )
    for (const row of rows.rows || []) await audit(client, 'task.lease_expired', row.task_id, { machineId: row.machine_id })
  }
  return {
    async registerMachine({ machineId, proof, decision }) {
      const at = timestamp()
      requireThat(MACHINE.test(machineId || '') && proof?.verified === true &&
        proof.machineId === machineId && HEX64.test(proof.proofId || '') &&
        HEX64.test(proof.keyFingerprint || '') &&
        Number.isSafeInteger(proof.expiresAt) && proof.expiresAt > at &&
        acceptedDecision(decision, 'machine.approve', machineId, at), 'machine_identity_or_approval_unverified')
      return transaction(async client => {
        // A previously revoked machine cannot be silently resurrected.
        await client.query(
          "INSERT INTO neo_omarchy.machines(machine_id,state,proof_id,issuer_key_fingerprint,proof_expires_at,approved_by) VALUES($1,'approved',$2,$3,$4,$5)",
          [machineId, proof.proofId.toLowerCase(), proof.keyFingerprint.toLowerCase(),
            new Date(proof.expiresAt).toISOString(), decision.subject],
        )
        await audit(client, 'machine.approved', machineId, {
          operator: decision.subject, proofDigest: sha(proof.proofId), scope: 'local-inference',
        })
        return { machineId, state: 'approved' }
      })
    },
    async enqueue({ taskId, objective, maxTokens = 256, decision }) {
      const at = timestamp()
      requireThat(TASK.test(taskId || '') && typeof objective === 'string' &&
        objective.trim().length >= 1 && objective.length <= 2000 &&
        Number.isInteger(maxTokens) && maxTokens >= 1 && maxTokens <= 512 &&
        acceptedDecision(decision, 'task.queue', taskId, at), 'task_authorization_invalid')
      return transaction(async client => {
        await client.query(
          "INSERT INTO neo_omarchy.tasks(task_id,objective,max_tokens,state,approved_by) VALUES($1,$2,$3,'queued',$4)",
          [taskId, objective, maxTokens, decision.subject],
        )
        await audit(client, 'task.queued', taskId, { operator: decision.subject, scope: 'local-inference' })
        return { taskId, state: 'queued' }
      })
    },
    async leaseNext({ machineId }) {
      requireThat(MACHINE.test(machineId || ''), 'machine_id_invalid')
      const at = timestamp()
      return transaction(async client => {
        await expire(client, at)
        const machine = await client.query(
          'SELECT state,proof_expires_at FROM neo_omarchy.machines WHERE machine_id=$1 FOR UPDATE', [machineId],
        )
        const row = machine.rows?.[0]
        requireThat(row?.state === 'approved' && +new Date(row.proof_expires_at) > at, 'machine_not_authorized')
        const active = await client.query(
          "SELECT task_id FROM neo_omarchy.tasks WHERE machine_id=$1 AND state='leased' LIMIT 1", [machineId],
        )
        requireThat(!active.rows?.length, 'machine_lease_limit')
        const selected = await client.query(
          "SELECT task_id,objective,max_tokens FROM neo_omarchy.tasks WHERE state='queued' ORDER BY created_at,task_id FOR UPDATE SKIP LOCKED LIMIT 1",
        )
        const task = selected.rows?.[0]
        if (!task) return null
        const token = random(32).toString('hex')
        requireThat(HEX64.test(token), 'lease_entropy_invalid')
        const expiresAt = at + 30_000
        await client.query(
          "UPDATE neo_omarchy.tasks SET state='leased',machine_id=$1,lease_hash=$2,lease_expires_at=$3,attempts=attempts+1 WHERE task_id=$4 AND state='queued'",
          [machineId, sha(token), new Date(expiresAt).toISOString(), task.task_id],
        )
        await audit(client, 'task.leased', task.task_id, { machineId, expiresAt })
        return {
          machineId, leaseToken: token, expiresAt,
          task: { taskId: task.task_id, capability: 'local-inference', objective: task.objective, maxTokens: task.max_tokens },
        }
      })
    },
    async complete({ machineId, taskId, leaseToken, outcome, resultDigest }) {
      requireThat(MACHINE.test(machineId || '') && TASK.test(taskId || '') &&
        HEX64.test(leaseToken || '') && HEX64.test(resultDigest || '') &&
        ['completed', 'failed'].includes(outcome), 'receipt_invalid')
      const at = timestamp()
      return transaction(async client => {
        await expire(client, at)
        const machine = await client.query(
          'SELECT state,proof_expires_at FROM neo_omarchy.machines WHERE machine_id=$1 FOR UPDATE', [machineId],
        )
        requireThat(machine.rows?.[0]?.state === 'approved' &&
          +new Date(machine.rows[0].proof_expires_at) > at, 'machine_not_authorized')
        const result = await client.query(
          'SELECT state,machine_id,lease_hash,lease_expires_at FROM neo_omarchy.tasks WHERE task_id=$1 FOR UPDATE',
          [taskId],
        )
        const t = result.rows?.[0]
        requireThat(t?.state === 'leased' && t.machine_id === machineId &&
          +new Date(t.lease_expires_at) > at && sameDigest(sha(leaseToken), t.lease_hash),
          'lease_not_active')
        await client.query(
          "UPDATE neo_omarchy.tasks SET state=$1,lease_hash=NULL,result_digest=$2 WHERE task_id=$3",
          [outcome, resultDigest.toLowerCase(), taskId],
        )
        await audit(client, 'task.completed', taskId, { machineId, outcome, resultDigest: resultDigest.toLowerCase() })
        return { taskId, state: outcome }
      })
    },
    async revoke({ machineId, decision }) {
      const at = timestamp()
      requireThat(MACHINE.test(machineId || '') &&
        acceptedDecision(decision, 'machine.revoke', machineId, at), 'revocation_approval_unverified')
      return transaction(async client => {
        const result = await client.query(
          "UPDATE neo_omarchy.machines SET state='revoked',revoked_at=$2 WHERE machine_id=$1 AND state='approved' RETURNING machine_id",
          [machineId, new Date(at).toISOString()],
        )
        requireThat(result.rows?.length === 1, 'machine_not_active')
        const quarantined = await client.query(
          "UPDATE neo_omarchy.tasks SET state='needs-review',lease_hash=NULL WHERE machine_id=$1 AND state='leased' RETURNING task_id",
          [machineId],
        )
        for (const row of quarantined.rows || []) await audit(client, 'task.quarantined', row.task_id, { machineId })
        await audit(client, 'machine.revoked', machineId, { operator: decision.subject })
        return { machineId, state: 'revoked', tasksQuarantined: quarantined.rows?.length || 0 }
      })
    },
  }
}
