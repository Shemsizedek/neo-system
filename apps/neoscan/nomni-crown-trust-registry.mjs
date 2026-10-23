// NOMNI-SEO-024: explicit, versioned Crown signer trust policy.
// All unknown, revoked or expired signers fail closed. No self-certification.
export function createNomniCrownTrustRegistry(entries=[],{now=()=>Date.now()}={}){
 const keys=new Map();
 for(const item of entries){
  if(!item||!/^[-a-zA-Z0-9_]{3,80}$/.test(item.key_id||'')||typeof item.public_key_pem!=='string')throw new TypeError('invalid_trust_entry');
  if(keys.has(item.key_id))throw new TypeError('duplicate_key_id');
  if(!Number.isFinite(Date.parse(item.valid_from))||!Number.isFinite(Date.parse(item.valid_until))||Date.parse(item.valid_until)<=Date.parse(item.valid_from))throw new TypeError('invalid_validity_interval');
  if(!['active','revoked'].includes(item.status))throw new TypeError('invalid_key_status');
  keys.set(item.key_id,Object.freeze({...item}));
 }
 return Object.freeze({
  getTrustedKey(keyId){
   const entry=keys.get(keyId),time=now();
   if(!entry||entry.status!=='active'||time<Date.parse(entry.valid_from)||time>=Date.parse(entry.valid_until))return null;
   return entry.public_key_pem;
  },
  publicStatus(){return [...keys.values()].map(x=>({key_id:x.key_id,status:x.status,valid_from:x.valid_from,valid_until:x.valid_until,currently_trusted:!!this.getTrustedKey(x.key_id)}));},
  trustedKeys(){return Object.fromEntries([...keys.keys()].map(k=>[k,this.getTrustedKey(k)]).filter(([,v])=>v!==null))}
 });
}
