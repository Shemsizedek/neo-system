// NEO-OMARCHY-004: outbound-only, application-signed private HTTPS transport contract.
// No host listener and no actual server deployment. HTTPS/mTLS infrastructure is external.
import { createPrivateKey, createPublicKey, sign, verify, randomBytes } from 'node:crypto'

const MACHINE = /^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const HEX64 = /^[a-f0-9]{64}$/i
const TASK = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const BASE64URL = /^[A-Za-z0-9_-]+$/

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map(k => [k, canonical(value[k])]))
  return value
}
const wire = value => Buffer.from(JSON.stringify(canonical(value)))
function parseKey(raw, use) {
  try {
    const key = use === 'private' ? createPrivateKey(raw) : createPublicKey(raw)
    if (key.asymmetricKeyType !== 'ed25519') throw new Error('bad_key')
    return key
  } catch { throw new Error('pinned_ed25519_keys_required') }
}
const strictKeys = (value, names) => value && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).sort().join(',') === [...names].sort().join(',')

export function validatePrivateOrigin(input, expectedHost) {
  try {
    const u = new URL(input)
    return u.protocol === 'https:' && u.hostname === expectedHost &&
      /^[a-z0-9][a-z0-9.-]*\.internal$/.test(expectedHost || '') &&
      u.pathname === '/' && !u.username && !u.password && !u.search && !u.hash &&
      !u.port && u.origin === input.replace(/\/$/, '')
  } catch { return false }
}

export function createSignedOutboundTransport({
  origin, expectedHost, machineId, machinePrivateKeyPem, serverPublicKeyPem,
  fetchImpl = fetch, now = () => Date.now(), nonce = () => randomBytes(32).toString('hex'),
} = {}) {
  if (!validatePrivateOrigin(origin, expectedHost) || !MACHINE.test(machineId || '')) {
    throw new Error('private_https_origin_and_machine_required')
  }
  const machineKey = parseKey(machinePrivateKeyPem, 'private')
  const serverKey = parseKey(serverPublicKeyPem, 'public')
  let busy = false
  async function send(action, body) {
    if (busy) throw new Error('transport_busy')
    if (!['lease.poll', 'lease.receipt'].includes(action)) throw new Error('action_not_allowed')
    if (action === 'lease.poll' && (body !== null)) throw new Error('poll_payload_forbidden')
    if (action === 'lease.receipt' && (!strictKeys(body, ['taskId', 'leaseToken', 'outcome', 'resultDigest']) ||
      !TASK.test(body.taskId || '') || !HEX64.test(body.leaseToken || '') ||
      !HEX64.test(body.resultDigest || '') || !['completed','failed'].includes(body.outcome))) {
      throw new Error('receipt_schema_rejected')
    }
    busy = true
    try {
      const issuedAt = now()
      const requestNonce = nonce()
      if (!Number.isSafeInteger(issuedAt) || !HEX64.test(requestNonce)) throw new Error('invalid_nonce_or_clock')
      const payload = { schema: 'NEO-OMARCHY-PRIVATE-004', machineId, action, body, issuedAt, nonce: requestNonce }
      const signature = sign(null, wire(payload), machineKey).toString('base64url')
      const response = await fetchImpl(new URL('/private/v1/worker', origin), {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload, signature }),
      })
      if (!response?.ok || response.status !== 200 ||
          !String(response.headers?.get?.('content-type') || '').startsWith('application/json')) {
        throw new Error('private_transport_failed')
      }
      const raw = await response.text()
      if (raw.length > 8192) throw new Error('oversized_server_response')
      const data = JSON.parse(raw)
      if (!strictKeys(data, ['payload','signature']) ||
          !BASE64URL.test(data.signature || '') ||
          !strictKeys(data.payload, ['schema','machineId','action','requestNonce','issuedAt','expiresAt','body'])) {
        throw new Error('server_attestation_invalid')
      }
      const signed = Buffer.from(data.signature, 'base64url')
      const statement = data.payload
      if (signed.length !== 64 || signed.toString('base64url') !== data.signature ||
          !verify(null, wire(statement), serverKey, signed) ||
          statement.schema !== 'NEO-OMARCHY-PRIVATE-004' ||
          statement.action !== action || statement.machineId !== machineId ||
          statement.requestNonce !== requestNonce ||
          !Number.isSafeInteger(statement.issuedAt) || !Number.isSafeInteger(statement.expiresAt) ||
          statement.issuedAt > now() + 5000 || statement.expiresAt < now() ||
          statement.expiresAt - statement.issuedAt > 10_000) {
        throw new Error('server_attestation_invalid')
      }
      return statement.body
    } finally { busy = false }
  }
  return {
    pollLease: async () => send('lease.poll', null),
    submitReceipt: async receipt => {
      if (receipt?.machineId !== machineId) throw new Error('machine_identity_mismatch')
      const { machineId: ignored, ...body } = receipt
      return send('lease.receipt', body)
    },
  }
}
