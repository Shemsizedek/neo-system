import {createHash,verify as cryptoVerify,createPublicKey} from 'node:crypto';
import {oracleEvidenceReceipt,classifyOracleEvidence} from '../../server/neo-prime/evidence.mjs';

// Crown Chain maintains evidence attestations, not automatic legal title, collateral or index prices.
const HEX=/^[a-f0-9]{64}$/i;
const B64=/^[A-Za-z0-9+/]+={0,2}$/;
export function verifyCrownAttestation(attestation,{trustedKeys={},now=Date.now(),nodeVerified=false}={}){
 if(!attestation||typeof attestation!=='object')throw new TypeError('attestation_required');
 const {key_id,signature,receipt,record_digest,rights_evidence_hash,reserve_evidence_hash}=attestation;
 if(typeof key_id!=='string'||!trustedKeys[key_id])return {status:'untrusted_signer',publishable:false};
 if(typeof record_digest!=='string'||!HEX.test(record_digest))return {status:'invalid_digest',publishable:false};
 const digest=createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
 if(digest!==record_digest)return {status:'tampered',publishable:false};
 if(typeof signature!=='string'||!B64.test(signature))return {status:'invalid_signature',publishable:false};
 const message=Buffer.from(record_digest,'utf8');
 let valid=false;
 try{valid=cryptoVerify(null,message,createPublicKey(trustedKeys[key_id]),Buffer.from(signature,'base64'))}catch{return {status:'invalid_signature',publishable:false}}
 if(!valid)return {status:'invalid_signature',publishable:false};
 if(receipt?.schema!=='neo-oracle-evidence-v1')return {status:'invalid_receipt',publishable:false};
 let classified;
 try{classified=classifyOracleEvidence(receipt,{nodeVerified,now})}catch{return {status:'invalid_receipt',publishable:false}}
 const evidenceHashesValid=[rights_evidence_hash,reserve_evidence_hash].every(x=>x==null||(typeof x==='string'&&HEX.test(x)));
 if(!evidenceHashesValid)return {status:'invalid_evidence_hash',publishable:false};
 return Object.freeze({status:classified.status,signature_verified:true,onchain_evidence_publishable:classified.publishable,
  rights_evidence_status:rights_evidence_hash?'referenced_not_legally_verified':'not_supplied',
  reserve_evidence_status:reserve_evidence_hash?'referenced_not_independently_audited':'not_supplied',
  asset_ownership_verified:false,reserve_backing_verified:false,valuation_verified:false,
  index_level:null,publishable:classified.publishable});
}
export function buildCrownEvidenceEnvelope({asset='NOMNI',attestation,verification}={}){
 if(asset!=='NOMNI'||!verification)throw new TypeError('invalid_crown_envelope');
 return Object.freeze({schema_version:'nomni.crown-evidence.v0.1',asset,
  attestation_status:verification.status,signature_verified:verification.signature_verified===true,
  onchain_evidence_publishable:verification.onchain_evidence_publishable===true,
  rights_evidence_status:verification.rights_evidence_status??'not_supplied',
  reserve_evidence_status:verification.reserve_evidence_status??'not_supplied',
  asset_ownership_verified:false,reserve_backing_verified:false,index_level:null,
  attestation_hash:attestation?.record_digest??null});
}
