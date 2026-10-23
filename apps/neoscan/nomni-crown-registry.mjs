import {createHash} from 'node:crypto';
import {verifyCrownAttestation,buildCrownEvidenceEnvelope} from './nomni-crown-evidence.mjs';
const HASH=/^[a-f0-9]{64}$/i;
export function createCrownEvidenceRegistry({trustedKeys={},nodeVerified=false,now=()=>Date.now()}={}){
 const records=new Map();
 function register({asset='NOMNI',attestation}={}){
  if(asset!=='NOMNI'||!attestation)throw new TypeError('invalid_evidence_record');
  const result=verifyCrownAttestation(attestation,{trustedKeys,nodeVerified,now:now()});
  const envelope=buildCrownEvidenceEnvelope({asset,attestation,verification:result});
  const id=attestation.record_digest;
  if(typeof id!=='string'||!HASH.test(id))throw new TypeError('invalid_evidence_id');
  if(records.has(id))return {inserted:false,record:records.get(id)};
  const record=Object.freeze({id,asset,created_at:new Date(now()).toISOString(),...envelope,
    public_labels:{blockchain:result.onchain_evidence_publishable?'Node-verified receipt':'Not independently verified',
      signature:result.signature_verified?'Valid signature':'Unverified signature',
      asset_backing:'Not independently verified',legal_ownership:'Not independently verified',market_value:'No verified valuation'}});
  records.set(id,record);
  return {inserted:true,record};
 }
 function list(){return [...records.values()].map(r=>({...r}));}
 function marketSummary(){const entries=list();return {schema_version:'nomni.market-verification.v0.1',asset:'NOMNI',
  reported_supply:null,verified_market_price:null,verified_index_level:null,verified_reserve_value:null,
  evidence_records:entries.length,last_evidence_at:entries.at(-1)?.created_at??null,
  status:entries.some(x=>x.onchain_evidence_publishable)?'blockchain-evidence-available':'awaiting-verification',
  disclosure:'Cryptographic receipts do not establish reserve backing, legal title or an independent valuation.'};}
 return Object.freeze({register,list,marketSummary});
}
