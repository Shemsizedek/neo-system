import {randomBytes} from 'node:crypto';
import {createNeoKeyNeopassAuthority} from './neopass-authority.mjs';
import {createVerifiedRegistrationAdapter} from './registration-verifier.mjs';
import {createNeoKeyAssertionService} from './assertion-verifier.mjs';
import {createPostgresNeoKeyAssertionStore} from './postgres-assertion-store.mjs';
import {createNeoKeyLifecycle} from '../neo-key-lifecycle.mjs';
import {createPostgresNeoKeyStore} from '../neo-key-postgres-store.mjs';

// Deliberately unmounted: no listener, HTTP handler, token issuer, environment
// lookup, database migration, fallback account, or production activation.
// All trust decisions are from independently supplied server-side adapters.
export function createNeoKeyStagingAdapter({
  enabled=false, rpId, origin, pool, verifyIssuerToken,
  getAuthoritativeAccount, verifyOperatorBootstrap,
  now=()=>Date.now()
}={}) {
  if (enabled!==true || !pool || typeof verifyOperatorBootstrap!=='function' ||
      typeof verifyIssuerToken!=='function' ||
      typeof getAuthoritativeAccount!=='function' ||
      typeof rpId!=='string' || origin!==`https://${rpId}`) {
    throw Error('neo_key_staging_explicit_authorization_required');
  }
  const identity=createNeoKeyNeopassAuthority({
    verifyIssuerToken,getAuthoritativeAccount,now
  });
  const resolveSessionSubject=session=>identity.resolveSessionSubject(session);
  const assertion=createNeoKeyAssertionService({
    rpId,origin,store:createPostgresNeoKeyAssertionStore(pool),resolveSessionSubject,now
  });
  const lifecycle=createNeoKeyLifecycle({
    rpId,origin,store:createPostgresNeoKeyStore(pool),
    resolveSessionSubject,verifyRegistrationResponse:createVerifiedRegistrationAdapter(),
    // The operator verifier MUST be an independently signed, audited
    // dual-control first-key approval. A payload boolean is insufficient.
    authorizeEnrollment:async ({subject,session})=>{
      if(session?.stepUpResponse) {
        const proof=await assertion.verify({response:session.stepUpResponse});
        if(proof?.subject!==subject || proof.action!=='enroll' ||
           proof.purpose!=='authenticate' ||
           proof.origin!==origin || proof.rpId!==rpId ||
           now()-proof.verifiedAt>60_000)return null;
        return {allowed:true,method:'verified-existing-passkey',
          authorizationRef:randomBytes(20).toString('base64url')};
      }
      const approved=await verifyOperatorBootstrap({subject,rpId,origin,
        bootstrapEvidence:session?.bootstrapEvidence});
      if(approved?.verified!==true || approved.method!=='dual-control' ||
         approved.subject!==subject ||
         typeof approved.authorizationRef!=='string' ||
         !/^[A-Za-z0-9_-]{16,128}$/.test(approved.authorizationRef))return null;
      return {allowed:true,method:'verified-operator-bootstrap',
        authorizationRef:approved.authorizationRef};
    },
    verifyExistingAssertion:response=>assertion.verify({response}),now
  });
  return Object.freeze({
    // Issuance of authentication challenge is read-only for privileges.
    beginAuthentication:({session,credentialId})=>
      assertion.begin({session,credentialId,action:'authenticate'}),
    verifyAuthentication:({response})=>assertion.verify({response}),
    beginEnrollmentStepUp:({session,credentialId})=>
      assertion.begin({session,credentialId,action:'enroll'}),
    beginRegistration:({session,stepUpResponse,bootstrapEvidence})=>
      lifecycle.beginRegistration({session:{
        token:session?.token,stepUpResponse,bootstrapEvidence
      }}),
    finishRegistration:({session,challenge,response})=>
      lifecycle.finishRegistration({session,challenge,response}),
    beginRecovery:({session,backupCredentialId,targetCredentialId})=>
      assertion.begin({session,credentialId:backupCredentialId,
        action:'recover',targetCredentialId}),
    finishRecovery:({session,targetCredentialId,response})=>
      lifecycle.revokeLostCredential({session,targetCredentialId,
        backupAssertion:response})
  });
}
