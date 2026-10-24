import {createHmac} from 'node:crypto';
// NTEL-016: server-keyed unlinkable drafts, NEVER pass public wallet/phone IDs on-chain.
export function createNeoMaskEntitlementDraft({key,memberInternalId,deviceInternalId,walletOwnershipVerified,guardianApproved}={}){
 if(!Buffer.isBuffer(key)||key.length<32) throw Error('secure_commitment_key_required');
 if(typeof memberInternalId!=='string'||!memberInternalId||typeof deviceInternalId!=='string'||!deviceInternalId) throw Error('identity_and_device_required');
 if(walletOwnershipVerified!==true||guardianApproved!==true) throw Error('wallet_and_guardian_approval_required');
 const commit=(scope,value)=>'hmac-sha256:'+createHmac('sha256',key).update('NEOTELE-1:'+scope+':'+value).digest('hex');
 return Object.freeze({
  protocol:'NEOTELE-ENTITLEMENT-1',issuer:'Noogle Telecommunications',
  network:'BITCOIN_COUNTERPARTY',memberCommitment:commit('member',memberInternalId),
  deviceCommitment:commit('device',deviceInternalId),
  status:'OFFCHAIN_DRAFT',transferable:false,carrierProfileIssued:false,
  txid:null,blockchainPublished:false,activationEnabled:false,
  // Never include or store the HMAC key, wallet private keys, EID, ICCID,
  // phone number, activation QR, or raw service subscriber identifiers.
 });
}
