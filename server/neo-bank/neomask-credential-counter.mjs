// NEOB-024: credential counter storage boundary; no HTTP routes.
// Trusted WebAuthn verifier must validate authenticator signature and UV first.
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(String(x)).digest('hex');
export function createCredentialCounterStore({db}={}){
 if(typeof db?.runTransaction!=='function')throw Error('credential_store_required');
 const records=db.collection('neoMaskCredentials');
 return Object.freeze({
  async advance({subject,credentialId,expectedCounter,nextCounter}){
   if(!subject||!credentialId||!Number.isSafeInteger(expectedCounter)||expectedCounter<0||
      !Number.isSafeInteger(nextCounter)||nextCounter<=expectedCounter) return false;
   const ref=records.doc(hash(credentialId));
   return db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)return false;
    const row=snap.data();
    if(row.subject!==subject||row.status!=='active'||row.rpId!=='connect.holytemples.org'||
       row.counter!==expectedCounter) return false;
    tx.update(ref,{counter:nextCounter});
    return true;
   });
  }
 });
}
// Credential enrollment, device-specific passkeys with zero counters, and
// synchronization of assertion counter advancement with approval consumption
// require a reviewed credential service. Do not enable this in production alone.
