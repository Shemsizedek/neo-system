import {DatabaseSync} from 'node:sqlite';

// Internal provisioning only. Pin the provider's stable subject from the existing
// verified owner registry; email strings and public signup order are insufficient.
export function createNeopassFirstAccount({expectedIssuer,expectedProviderSubject,resolveOwnerIdentity,store}={}){
 if(typeof expectedIssuer!=='string'||!expectedIssuer.startsWith('https://')||typeof expectedProviderSubject!=='string'||!expectedProviderSubject||typeof resolveOwnerIdentity!=='function'||typeof store?.reserve!=='function')throw Error('pinned_owner_configuration_required');
 return async function provision(sessionHandle){
  const identity=await resolveOwnerIdentity(sessionHandle);
  if(identity?.verified!==true||identity.issuer!==expectedIssuer||identity.providerSubject!==expectedProviderSubject||typeof identity.canonicalSubject!=='string'||!identity.canonicalSubject)throw Error('verified_first_owner_required');
  return store.reserve({issuer:expectedIssuer,providerSubject:expectedProviderSubject,canonicalSubject:identity.canonicalSubject});
 };
}
export function createNeopassFirstAccountStore(path){
 if(typeof path!=='string'||!path||path===':memory:')throw Error('persistent_owner_store_required');
 const db=new DatabaseSync(path);db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS neopass_first_account(slot INTEGER PRIMARY KEY CHECK(slot=1),subject TEXT NOT NULL UNIQUE,issuer TEXT NOT NULL,provider_subject TEXT NOT NULL,UNIQUE(issuer,provider_subject));`);
 return Object.freeze({
  async reserve({issuer,providerSubject,canonicalSubject}){
   if(typeof canonicalSubject!=='string'||!canonicalSubject)throw Error('canonical_owner_subject_required');
   db.exec('BEGIN IMMEDIATE');try{
    const existing=db.prepare('SELECT subject,issuer,provider_subject FROM neopass_first_account WHERE slot=1').get();
    if(existing&&(existing.issuer!==issuer||existing.provider_subject!==providerSubject||existing.subject!==canonicalSubject))throw Error('first_account_already_reserved');
    const subject=canonicalSubject;
    if(!existing)db.prepare('INSERT INTO neopass_first_account VALUES(1,?,?,?)').run(subject,issuer,providerSubject);
    db.exec('COMMIT');return {subject,accountNumber:1,providerLinked:true,passkeyEnrolled:false,servicePermissionsGranted:false};
   }catch(error){db.exec('ROLLBACK');throw error;}
  },close(){db.close();}
 });
}
