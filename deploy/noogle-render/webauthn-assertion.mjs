import { createHash, createPublicKey, verify } from 'node:crypto';

// Isolated WebAuthn assertion verifier; no routes, no issued permissions.
// Credential registration, challenge issuance, user-verification policy, and
// atomic challenge consumption are required external trusted dependencies.
const sha256=b=>createHash('sha256').update(b).digest();
const equal=(a,b)=>Buffer.isBuffer(a)&&Buffer.isBuffer(b)&&a.length===b.length&&a.equals(b);
export function createAssertionVerifier({rpId,origin,consumeChallenge,getCredential}) {
 if(!rpId||!origin||typeof consumeChallenge!=='function'||typeof getCredential!=='function')
   throw Error('webauthn_configuration_required');
 return async function verifyAssertion({credentialId,clientDataJSON,authenticatorData,signature}) {
  try {
   if([credentialId,clientDataJSON,authenticatorData,signature].some(v=>typeof v!=='string'||v.length>16384||!v.length))return null;
   const clientRaw=Buffer.from(clientDataJSON,'base64url');
   const client=JSON.parse(clientRaw.toString('utf8'));
   if(client.type!=='webauthn.get'||client.origin!==origin||client.crossOrigin===true||
      typeof client.challenge!=='string'||!client.challenge)return null;
   const authData=Buffer.from(authenticatorData,'base64url');
   if(authData.length<37||!equal(authData.subarray(0,32),sha256(Buffer.from(rpId))))return null;
   const flags=authData[32],userPresent=!!(flags&1),userVerified=!!(flags&4);
   if(!userPresent||!userVerified)return null;
   const credential=await getCredential(credentialId);
   if(!credential || credential.revoked || credential.rpId!==rpId)return null;
   if(!await consumeChallenge({challenge:client.challenge,credentialId,subject:credential.subject}))return null;
   const counter=authData.readUInt32BE(33);
   const key=createPublicKey(credential.publicKey);
   const signed=Buffer.concat([authData,sha256(clientRaw)]);
   if(!verify('sha256',signed,key,Buffer.from(signature,'base64url')))return null;
   // Counter validation/update must be atomic against durable credential storage.
   if(typeof credential.confirmCounter!=='function'||!await credential.confirmCounter(counter))return null;
   return {subject:credential.subject,credentialId,assurance:'device-bound'};
  }catch{return null;}
 };
}
