import { createHash } from 'node:crypto'
import { DEFAULT_WORKER_PROFILES } from './worker-fleet.mjs'

const sha256 = value => createHash('sha256').update(value).digest()
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(value)

// Gate 1 deliberately accepts only mainnet legacy P2PKH public addresses.
// Syntax/checksum validation is not evidence of wallet control or spendability.
export function isLegacyMainnetAddress(address) {
  if (typeof address !== 'string' || !/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) return false
  let n = 0n
  for (const char of address) n = n * 58n + BigInt(alphabet.indexOf(char))
  const hex = n.toString(16).padStart(Math.ceil(n.toString(16).length / 2) * 2, '0')
  const leading = address.match(/^1*/)[0].length
  const bytes = Buffer.concat([Buffer.alloc(leading), Buffer.from(hex, 'hex')])
  return bytes.length === 25 && bytes[0] === 0 &&
    sha256(sha256(bytes.subarray(0, 21))).subarray(0, 4).equals(bytes.subarray(21))
}

/** Offline proposal register. Caller supplies trusted principals and mission engine.
 * No endpoint, wallet creation, identity authentication, signer or payment adapter.
 */
export function createAgentWalletRegister({ principals = DEFAULT_WORKER_PROFILES.map(p => p.id), engine } = {}) {
  if (!Array.isArray(principals) || !principals.length || !principals.every(identifier)) throw new TypeError('Invalid principals')
  const known = new Set(principals)
  const bindings = new Map()
  const addresses = new Set()
  const receipts = new Map()

  function propose(input) {
    if (!input || Object.keys(input).some(key => !['principalId', 'ownerId', 'address', 'protocol', 'provider', 'ledger'].includes(key))) throw new TypeError('Only public binding fields accepted')
    const { principalId, ownerId, address, protocol, provider = 'existing-wallet', ledger = protocol === 'bitcoin' ? 'bitcoin' : 'unverified' } = input
    if (!known.has(principalId) || !identifier(ownerId)) throw new TypeError('Known principal and owner reference required')
    if (!['bitcoin', 'counterparty'].includes(protocol) || !isLegacyMainnetAddress(address)) throw new TypeError('Supported mainnet public address required')
    if (!['existing-wallet', 'freewallet.io', 'xcp-wallet', 'counterpay', 'other-counterparty-wallet'].includes(provider)) throw new TypeError('Supported provider label required')
    if (protocol === 'bitcoin' ? ledger !== 'bitcoin' : !['unverified', 'counterparty-2.0', 'counterparty-classic'].includes(ledger)) throw new TypeError('Explicit compatible ledger label required')
    if (bindings.has(principalId) || addresses.has(address)) throw new Error('Principal or address already assigned')
    const binding = { principalId, ownerId, address, protocol, provider, ledger, network: 'bitcoin-mainnet', status: 'pending-control-verification', signingEnabled: false }
    bindings.set(principalId, binding)
    addresses.add(address)
    return structuredClone(binding)
  }

  function recordWork({ principalId, missionId } = {}) {
    const binding = bindings.get(principalId)
    if (!binding || !identifier(missionId)) throw new Error('Binding and mission reference required')
    const mission = engine?.get(missionId)
    const completion = engine?.snapshot().events.find(e => e.type === 'mission.transition' && e.missionId === missionId && e.detail?.next === 'completed')
    if (mission?.status !== 'completed' || completion?.detail?.workerId !== principalId) throw new Error('Matching worker completion evidence required')
    const existing = receipts.get(missionId)
    if (existing) return structuredClone(existing)
    const payload = { schemaVersion: 1, principalId, missionId, address: binding.address, protocol: binding.protocol, completionEventId: completion.id, completedAt: completion.timestamp, kind: 'internal-work-reference', settlementStatus: 'not-requested', onChain: false }
    const receipt = { ...payload, digest: sha256(JSON.stringify(payload)).toString('hex') }
    receipts.set(missionId, receipt)
    return structuredClone(receipt)
  }

  return Object.freeze({ propose, recordWork, snapshot: () => structuredClone({ mode: 'offline-proposal', durable: false, bindings: [...bindings.values()], receipts: [...receipts.values()] }) })
}
