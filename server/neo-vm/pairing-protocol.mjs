import { ECDH, createPublicKey } from 'node:crypto'
import { decodeHex, requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'
import { normalizeSignerEndpoint } from './signer-endpoint.mjs'

const fail = code => { throw new VmInputError(code) }
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/
export function pairingHash(value) {
  const bytes = decodeHex(value,32)
  if (bytes.length !== 32) fail('PAIRING_HASH_INVALID')
  return bytes.toString('hex')
}
export function ed25519PairingKey(hex) {
  return createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(pairingHash(hex),'hex')]),type:'spki',format:'der'})
}
export function bitcoinPairingKey(hex) {
  const bytes = decodeHex(hex,33)
  if (bytes.length !== 33 || ![2,3].includes(bytes[0])) fail('PAIRING_BITCOIN_KEY_INVALID')
  let uncompressed
  try { uncompressed = ECDH.convertKey(bytes,'secp256k1',undefined,undefined,'uncompressed') }
  catch { fail('PAIRING_BITCOIN_KEY_INVALID') }
  return createPublicKey({key:Buffer.concat([Buffer.from('3056301006072a8648ce3d020106052b8104000a034200','hex'),uncompressed]),type:'spki',format:'der'})
}
export function normalizePairingProposal(value) {
  requireFields(value,['version','network','signerId','devicePublicKeyHex','bitcoinPublicKeys','endpoint','pairingExpiresAt'])
  if (value.version !== 1 || value.network !== 'regtest' || typeof value.signerId !== 'string' || !ID.test(value.signerId) ||
      !Number.isSafeInteger(value.pairingExpiresAt) || value.pairingExpiresAt < 1 || !Array.isArray(value.bitcoinPublicKeys) || value.bitcoinPublicKeys.length < 1 || value.bitcoinPublicKeys.length > 8) fail('PAIRING_PROPOSAL_INVALID')
  const bitcoinPublicKeys = value.bitcoinPublicKeys.map(key => { bitcoinPairingKey(key); return key.toLowerCase() }).sort()
  if (new Set(bitcoinPublicKeys).size !== bitcoinPublicKeys.length) fail('PAIRING_BITCOIN_KEY_INVALID')
  return Object.freeze({version:1,network:'regtest',signerId:value.signerId,devicePublicKeyHex:pairingHash(value.devicePublicKeyHex),
    bitcoinPublicKeys:Object.freeze(bitcoinPublicKeys),endpoint:normalizeSignerEndpoint(value.endpoint),pairingExpiresAt:value.pairingExpiresAt})
}
export const pairingProposalHash = proposal => sha256Hex(Buffer.from(`neo-nvm/pairing-proposal-v1\0${JSON.stringify(normalizePairingProposal(proposal))}`))
function approval(value, field, domain) {
  requireFields(value,['version','authorizerId','nonce','issuedAt','expiresAt',field])
  if (value.version !== 1 || typeof value.authorizerId !== 'string' || !ID.test(value.authorizerId) || !Number.isSafeInteger(value.issuedAt) || value.issuedAt < 0 ||
      !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= value.issuedAt || value.expiresAt-value.issuedAt > 300) fail('PAIRING_APPROVAL_INVALID')
  return Buffer.from(`${domain}\0${JSON.stringify({version:1,authorizerId:value.authorizerId,nonce:pairingHash(value.nonce),issuedAt:value.issuedAt,expiresAt:value.expiresAt,[field]:pairingHash(value[field])})}`)
}
export const pairingApprovalChallenge = value => approval(value,'proposalHash','neo-nvm/pairing-approval-v1')
export const pairingRevocationChallenge = value => approval(value,'pairingId','neo-nvm/pairing-revoke-v1')
export function canonicalPairingChallenge(value) {
  requireFields(value,['version','network','challengeId','challengeNonce','proposal','proposalHash','ownerHash','approverId','approvalKeyHash','approval','issuedAt','expiresAt'])
  const proposal = normalizePairingProposal(value.proposal)
  if (value.version !== 1 || value.network !== 'regtest' || typeof value.approverId !== 'string' || !ID.test(value.approverId) ||
      !Number.isSafeInteger(value.issuedAt) || value.issuedAt < 0 || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= value.issuedAt || value.expiresAt-value.issuedAt > 120 ||
      pairingHash(value.proposalHash) !== pairingProposalHash(proposal)) fail('PAIRING_CHALLENGE_INVALID')
  requireFields(value.approval,['version','authorizerId','nonce','issuedAt','expiresAt','proposalHash','signatureHex'])
  const copied = {...value.approval}, {signatureHex,...unsigned} = copied
  pairingApprovalChallenge(unsigned)
  if (decodeHex(signatureHex,64).length !== 64 || copied.authorizerId !== value.approverId || copied.proposalHash.toLowerCase() !== pairingProposalHash(proposal) ||
      value.issuedAt < copied.issuedAt || value.expiresAt > copied.expiresAt) fail('PAIRING_APPROVAL_INVALID')
  const proof = Object.freeze({...unsigned,nonce:pairingHash(copied.nonce),proposalHash:pairingHash(copied.proposalHash),signatureHex:signatureHex.toLowerCase()})
  return Object.freeze({version:1,network:'regtest',challengeId:pairingHash(value.challengeId),challengeNonce:pairingHash(value.challengeNonce),proposal,
    proposalHash:pairingProposalHash(proposal),ownerHash:pairingHash(value.ownerHash),approverId:value.approverId,approvalKeyHash:pairingHash(value.approvalKeyHash),
    approval:proof,issuedAt:value.issuedAt,expiresAt:value.expiresAt})
}
export function pairingBitcoinKeyChallenge(value, publicKeyHex) {
  const c = canonicalPairingChallenge(value)
  if (!c.proposal.bitcoinPublicKeys.includes(publicKeyHex)) fail('PAIRING_BITCOIN_KEY_INVALID')
  return Buffer.from(`neo-nvm/pairing-bitcoin-key-v1\0${JSON.stringify({challengeId:c.challengeId,challengeNonce:c.challengeNonce,proposalHash:c.proposalHash,ownerHash:c.ownerHash,publicKeyHex,expiresAt:c.expiresAt})}`)
}
export function canonicalPairingProofs(value, challenge) {
  if (!Array.isArray(value) || value.length !== challenge.proposal.bitcoinPublicKeys.length) fail('PAIRING_KEY_PROOFS_REQUIRED')
  return Object.freeze(value.map((proof,index) => {
    requireFields(proof,['publicKeyHex','signatureHex'])
    if (proof.publicKeyHex !== challenge.proposal.bitcoinPublicKeys[index]) fail('PAIRING_KEY_PROOFS_REQUIRED')
    const bytes = decodeHex(proof.signatureHex,80)
    if (bytes.length < 8) fail('PAIRING_KEY_PROOFS_REQUIRED')
    return Object.freeze({publicKeyHex:proof.publicKeyHex,signatureHex:bytes.toString('hex')})
  }))
}
export function pairingDeviceChallenge(value, proofs) {
  const c = canonicalPairingChallenge(value), p = canonicalPairingProofs(proofs,c)
  return Buffer.from(`neo-nvm/pairing-device-v1\0${JSON.stringify({challenge:c,bitcoinProofs:p})}`)
}
