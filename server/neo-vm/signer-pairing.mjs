import { randomBytes, verify } from 'node:crypto'
import { createNeopassPsbtReviewer } from './neopass-psbt-review.mjs'
import { isSqliteApprovalStore } from './approval-store.mjs'
import { decodeHex, requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'
import { normalizeSignerEndpoint } from './signer-endpoint.mjs'
import { pairingHash,ed25519PairingKey,bitcoinPairingKey,normalizePairingProposal,pairingProposalHash,pairingApprovalChallenge,
  pairingRevocationChallenge,canonicalPairingChallenge,canonicalPairingProofs,pairingBitcoinKeyChallenge,pairingDeviceChallenge } from './pairing-protocol.mjs'

const fail = code => { throw new VmInputError(code) }, authorities = new WeakSet()
export const isSignerPairingAuthority = value => authorities.has(value)
export function createSignerPairingAuthority({registry,jwtSecret,jwtIssuer,bindings,approvalStore,approvedDeviceKeys,now=()=>Math.floor(Date.now()/1000)}={}) {
  if (!isSqliteApprovalStore(approvalStore)) fail('PAIRING_DURABLE_STORE_REQUIRED')
  const identity = createNeopassPsbtReviewer({registry,jwtSecret,jwtIssuer,bindings,approvalStore,now,rpc:async()=>fail('PAIRING_RPC_FORBIDDEN')})
  const operatorKeys = new Map(bindings.map(b=>[b.approverId,b.publicKey]))
  if (!Array.isArray(approvedDeviceKeys) || !approvedDeviceKeys.length || approvedDeviceKeys.length > 100) fail('PAIRING_DEVICE_PINS_REQUIRED')
  const pins = new Map()
  for (const pin of approvedDeviceKeys) {
    requireFields(pin,['signerId','publicKeyHex','endpoint'])
    if (typeof pin.signerId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(pin.signerId) || pins.has(pin.signerId)) fail('PAIRING_DEVICE_PIN_INVALID')
    pins.set(pin.signerId,Object.freeze({key:pairingHash(pin.publicKeyHex),endpoint:normalizeSignerEndpoint(pin.endpoint)}))
  }
  const time = () => { const value = now(); if (!Number.isSafeInteger(value) || value < 0) fail('PAIRING_CLOCK_INVALID'); return value }
  const requirePin = proposal => { const pin=pins.get(proposal.signerId); if (!pin || pin.key!==proposal.devicePublicKeyHex || pin.endpoint!==proposal.endpoint) fail('PAIRING_DEVICE_NOT_PINNED') }
  const verifyOwner = (proof, current, challenge) => {
    requireFields(proof,['version','authorizerId','nonce','issuedAt','expiresAt',challenge === pairingApprovalChallenge ? 'proposalHash':'pairingId','signatureHex'])
    const {signatureHex,...unsigned}=proof, bytes=decodeHex(signatureHex,64)
    const key=operatorKeys.get(current.approverId)
    if (proof.authorizerId!==current.approverId || bytes.length!==64 || !verify(null,challenge(unsigned),key,bytes)) fail('PAIRING_OWNER_PROOF_INVALID')
  }
  const fresh = proof => { if (time()<proof.issuedAt || time()>=proof.expiresAt) fail('PAIRING_APPROVAL_EXPIRED') }
  const verifyDevice = (challenge,proofs,signatureHex) => {
    requirePin(challenge.proposal)
    for (const proof of proofs) if (!verify('sha256',pairingBitcoinKeyChallenge(challenge,proof.publicKeyHex),bitcoinPairingKey(proof.publicKeyHex),Buffer.from(proof.signatureHex,'hex'))) fail('PAIRING_BITCOIN_PROOF_INVALID')
    const signature=decodeHex(signatureHex,64)
    if (signature.length!==64 || !verify(null,pairingDeviceChallenge(challenge,proofs),ed25519PairingKey(challenge.proposal.devicePublicKeyHex),signature)) fail('PAIRING_DEVICE_PROOF_INVALID')
  }
  const currentOwner = async (token, expected) => {
    const current=await identity.recheckIdentity({token})
    if (expected && (current.neopassSubjectHash!==expected.ownerHash || current.approverId!==expected.approverId || current.approvalKeyHash!==expected.approvalKeyHash)) fail('PAIRING_OWNER_MISMATCH')
    return current
  }
  const authority = Object.freeze({
    async challenge(input) {
      requireFields(input,['token','proposal','approval'])
      requireFields(input.approval,['version','authorizerId','nonce','issuedAt','expiresAt','proposalHash','signatureHex'])
      const token=input.token, proposal=normalizePairingProposal(input.proposal), proof=Object.freeze({...input.approval})
      requirePin(proposal)
      const current=await currentOwner(token)
      verifyOwner(proof,current,pairingApprovalChallenge); fresh(proof)
      if (pairingHash(proof.proposalHash)!==pairingProposalHash(proposal) || proposal.pairingExpiresAt<=time() || proposal.pairingExpiresAt-time()>30*86400) fail('PAIRING_PROPOSAL_INVALID')
      const issuedAt=time(), record=canonicalPairingChallenge({version:1,network:'regtest',challengeId:randomBytes(32).toString('hex'),challengeNonce:randomBytes(32).toString('hex'),proposal,
        proposalHash:pairingProposalHash(proposal),ownerHash:current.neopassSubjectHash,approverId:current.approverId,approvalKeyHash:current.approvalKeyHash,approval:proof,
        issuedAt,expiresAt:Math.min(proof.expiresAt,issuedAt+120)})
      await currentOwner(token,record); fresh(proof)
      approvalStore.savePairingChallenge(record,`neo-nvm/pairing-approval-v1:${current.approverId}:${pairingHash(proof.nonce)}`)
      return record
    },
    async complete(input) {
      requireFields(input,['token','challengeId','bitcoinProofs','deviceSignatureHex'])
      const token=input.token,id=pairingHash(input.challengeId),signatureHex=input.deviceSignatureHex
      // Capture all device-controlled values before the first identity await.
      if (!Array.isArray(input.bitcoinProofs)) fail('PAIRING_KEY_PROOFS_REQUIRED')
      const copied=input.bitcoinProofs.map(p=>{requireFields(p,['publicKeyHex','signatureHex']);return Object.freeze({...p})})
      const current=await currentOwner(token), stored=approvalStore.getPairingChallenge(id,current.neopassSubjectHash)
      if (!stored || stored.used || stored.expiresAt<=time()) fail('PAIRING_CHALLENGE_USED_OR_EXPIRED')
      const {used,...plain}=stored,challenge=canonicalPairingChallenge(plain),proofs=canonicalPairingProofs(copied,challenge)
      await currentOwner(token,challenge)
      verifyOwner(challenge.approval,current,pairingApprovalChallenge); verifyDevice(challenge,proofs,signatureHex)
      const record=Object.freeze({version:1,network:'regtest',pairingId:id,signerId:challenge.proposal.signerId,ownerHash:challenge.ownerHash,
        approverId:challenge.approverId,approvalKeyHash:challenge.approvalKeyHash,expiresAt:challenge.proposal.pairingExpiresAt,pairedAt:time(),challenge,bitcoinProofs:proofs,deviceSignatureHex:signatureHex.toLowerCase()})
      approvalStore.activatePairing(record)
      return Object.freeze({pairingId:id,signerId:record.signerId,network:'regtest',status:'ACTIVE',expiresAt:record.expiresAt,bitcoinKeysProven:proofs.length})
    },
    async getActive({token,pairingId}) {
      const id=pairingHash(pairingId),current=await currentOwner(token), record=approvalStore.getSignerPairing(id,current.neopassSubjectHash)
      if (!record || record.status!=='ACTIVE' || record.expiresAt<=time()) fail('PAIRING_NOT_ACTIVE')
      const {status,revokedAt,...certificate}=record, c=canonicalPairingChallenge(certificate.challenge),proofs=canonicalPairingProofs(certificate.bitcoinProofs,c)
      requireFields(certificate,['version','network','pairingId','signerId','ownerHash','approverId','approvalKeyHash','expiresAt','pairedAt','challenge','bitcoinProofs','deviceSignatureHex'])
      if (certificate.version!==1 || certificate.network!=='regtest' || !Number.isSafeInteger(certificate.pairedAt) ||
          c.ownerHash!==current.neopassSubjectHash || c.approverId!==current.approverId || c.approvalKeyHash!==current.approvalKeyHash ||
          certificate.ownerHash!==c.ownerHash || certificate.approverId!==c.approverId || certificate.approvalKeyHash!==c.approvalKeyHash || certificate.pairingId!==c.challengeId ||
          certificate.signerId!==c.proposal.signerId || certificate.expiresAt!==c.proposal.pairingExpiresAt || certificate.pairedAt<c.issuedAt || certificate.pairedAt>=c.expiresAt) fail('PAIRING_CERTIFICATE_INVALID')
      verifyOwner(c.approval,current,pairingApprovalChallenge);verifyDevice(c,proofs,certificate.deviceSignatureHex)
      return Object.freeze({pairingId:id,ownerHash:c.ownerHash,expiresAt:certificate.expiresAt,endpoint:c.proposal.endpoint,
        fingerprint:sha256Hex(Buffer.from(`neo-nvm/pairing-certificate-v1\0${JSON.stringify(certificate)}`)),
        signer:Object.freeze({signerId:certificate.signerId,publicKey:ed25519PairingKey(c.proposal.devicePublicKeyHex),bitcoinPublicKeys:c.proposal.bitcoinPublicKeys,approverIds:Object.freeze([c.approverId])})})
    },
    async revoke(input) {
      requireFields(input,['token','approval'])
      requireFields(input.approval,['version','authorizerId','nonce','issuedAt','expiresAt','pairingId','signatureHex'])
      const token=input.token,proof=Object.freeze({...input.approval}), current=await currentOwner(token)
      verifyOwner(proof,current,pairingRevocationChallenge); fresh(proof)
      approvalStore.revokeSignerPairing(pairingHash(proof.pairingId),current.neopassSubjectHash,`neo-nvm/pairing-revoke-v1:${current.approverId}:${pairingHash(proof.nonce)}`)
      return Object.freeze({pairingId:pairingHash(proof.pairingId),status:'REVOKED'})
    },
  })
  authorities.add(authority)
  return authority
}
