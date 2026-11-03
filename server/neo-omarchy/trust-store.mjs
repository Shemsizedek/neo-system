// NEO-OMARCHY-005 — PostgreSQL replay + trusted machine key lookup.
// This is an internal adapter, not an external authentication endpoint.
import { createPublicKey } from 'node:crypto'
const MACHINE = /^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const OPERATOR = /^neo:operator:[a-z0-9][a-z0-9._-]{0,63}$/
const HEX64 = /^[a-f0-9]{64}$/i

export function createOmarchyTrustStore({pool, now = () => Date.now()} = {}) {
  if (!pool || typeof pool.query !== 'function') throw new Error('postgres_query_pool_required')
  const stamp = () => {
    const t=now()
    if (!Number.isSafeInteger(t) || t<=0) throw new Error('clock_invalid')
    return t
  }
  return {
    async machinePublicKey(machineId) {
      if (!MACHINE.test(machineId || '')) throw new Error('invalid_machine_id')
      const result=await pool.query(
        'SELECT state,proof_expires_at,signing_public_key FROM neo_omarchy.machines WHERE machine_id=$1',
        [machineId],
      )
      const record=result.rows?.[0]
      if (record?.state !== 'approved' ||
          +new Date(record.proof_expires_at) <= stamp() ||
          typeof record.signing_public_key !== 'string') throw new Error('machine_not_authorized')
      let key
      try {
        key=createPublicKey(record.signing_public_key)
        if (key.asymmetricKeyType!=='ed25519') throw new Error('invalid_key')
      } catch { throw new Error('invalid_machine_signing_key') }
      return key
    },
    async consumeMachineNonce({machineId, nonce}) {
      if (!MACHINE.test(machineId || '') || !HEX64.test(nonce || '')) throw new Error('invalid_machine_nonce')
      const result=await pool.query(
        'INSERT INTO neo_omarchy.machine_replay(machine_id,nonce) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING nonce',
        [machineId,nonce.toLowerCase()],
      )
      return result.rows?.length === 1
    },
    async consumeOperatorNonce({subject,nonce}) {
      if (!OPERATOR.test(subject || '') || !HEX64.test(nonce || '')) throw new Error('invalid_operator_nonce')
      const result=await pool.query(
        'INSERT INTO neo_omarchy.operator_replay(subject_id,nonce) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING nonce',
        [subject,nonce.toLowerCase()],
      )
      return result.rows?.length === 1
    },
  }
}
