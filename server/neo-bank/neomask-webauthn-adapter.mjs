// NEOB-020: strict WebAuthn verification adapter. The injected WebAuthn library
// MUST perform cryptographic assertion verification, including signature,
// challenge, RP ID, origin, user verification, and authenticator counter.
export function createNeoMaskAssertionVerifier({
  verifyAuthenticationResponse, getCredential, getChallenge,
  expectedOrigin='https://connect.holytemples.org',
  expectedRPID='connect.holytemples.org', now=()=>Date.now()
}={}){
 if([verifyAuthenticationResponse,getCredential,getChallenge].some(fn=>typeof fn!=='function')) throw Error('webauthn_dependencies_required');
 if(expectedOrigin!=='https://connect.holytemples.org'||expectedRPID!=='connect.holytemples.org')
   throw Error('untrusted_relying_party');
 return async function verifyAssertion({subject,digest,operation,assertion,approvalId}){
  if(typeof subject!=='string'||!subject||!/^[a-f0-9]{64}$/.test(String(digest))||
     operation!=='ces.transfer'||!assertion||typeof approvalId!=='string') return false;
  const challenge=await getChallenge({subject,digest,operation,approvalId});
  if(!challenge||challenge.subject!==subject||challenge.digest!==digest||
     challenge.operation!==operation||challenge.approvalId!==approvalId||
     !challenge.challenge||!Number.isFinite(challenge.expiresAtMs)||challenge.expiresAtMs<=now())return false;
  const credential=await getCredential({subject,credentialId:assertion.id});
  if(!credential||credential.subject!==subject||credential.rpId!==expectedRPID||
     typeof credential.publicKey!=='string'||!credential.publicKey)return false;
  const result=await verifyAuthenticationResponse({
   response:assertion, expectedChallenge:challenge.challenge,
   expectedOrigin,expectedRPID,
   credential:{id:credential.id,publicKey:credential.publicKey,counter:credential.counter},
   requireUserVerification:true
  });
  // Counter persistence and challenge invalidation must be implemented in
  // the authenticated credential service with compare-and-set semantics.
  // This boundary is not production-certified without that service.
  return result?.verified===true&&result.authenticationInfo?.userVerified===true;
 }
}
