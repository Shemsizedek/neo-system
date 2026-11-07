// TEST ONLY: public disposable BTC keys and ephemeral Ed25519 identities.
import { sign } from 'node:crypto'
import { fixtureKey } from './neo-vm-fixtures.mjs'
import { pairingProposalHash,pairingApprovalChallenge,pairingRevocationChallenge,pairingBitcoinKeyChallenge,pairingDeviceChallenge } from '../../server/neo-vm/pairing-protocol.mjs'

export const fixtureEdPublicHex=key=>key.export({type:'spki',format:'der'}).subarray(-32).toString('hex')
export function fixturePairingApproval(proposal,key,{nonce='01'.repeat(32),issuedAt=1000,expiresAt=1200,authorizerId='fixture-operator'}={}) {
  const proof={version:1,authorizerId,nonce,issuedAt,expiresAt,proposalHash:pairingProposalHash(proposal)}
  return {...proof,signatureHex:sign(null,pairingApprovalChallenge(proof),key).toString('hex')}
}
export function fixturePairingRevocation(pairingId,key,{nonce='02'.repeat(32),issuedAt=1000,expiresAt=1200,authorizerId='fixture-operator'}={}) {
  const proof={version:1,authorizerId,nonce,issuedAt,expiresAt,pairingId}
  return {...proof,signatureHex:sign(null,pairingRevocationChallenge(proof),key).toString('hex')}
}
export function fixturePairingDeviceProof(challenge,key) {
  const bitcoinProofs=challenge.proposal.bitcoinPublicKeys.map(publicKeyHex=>{
    const fixture=[1,2,3].map(fixtureKey).find(k=>k.publicKeyHex===publicKeyHex)
    if(!fixture)throw Error('PUBLIC_TEST_KEYS_ONLY')
    return {publicKeyHex,signatureHex:sign('sha256',pairingBitcoinKeyChallenge(challenge,publicKeyHex),fixture.privateKey).toString('hex')}
  })
  return {bitcoinProofs,deviceSignatureHex:sign(null,pairingDeviceChallenge(challenge,bitcoinProofs),key).toString('hex')}
}
