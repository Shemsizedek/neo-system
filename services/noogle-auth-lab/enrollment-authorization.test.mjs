import test from 'node:test';import assert from 'node:assert/strict';
import {issueNeopassToken} from '../../server/neo-platform-api/neopass-google-auth.mjs';
import {EnrollmentAuthorization} from './enrollment-authorization.mjs';
const secret='test-only-verifier-secret',start=Date.UTC(2026,9,14,12);
let now=start;const service=new EnrollmentAuthorization({secret,clock:()=>now,maxAgeMs:300000});
const token=()=>issueNeopassToken({subject:'owner-1',secret,now:()=>now,ttlSeconds:600});
test('rejects session without independent fresh proof',()=>assert.throws(()=>service.establish(token()),/fresh_authentication_required/));
test('rejects forged tokens',()=>assert.throws(()=>service.establish('not-a-token',{freshProofValidated:true}),/identity_verification_failed/));
test('requires CSRF and server-side session',()=>{
 const issued=service.establish(token(),{freshProofValidated:true});
 assert.deepEqual(service.authorize(issued.sessionId,issued.csrfToken),{subject:'owner-1'});
 assert.throws(()=>service.authorize(issued.sessionId,'invalid'),/csrf_invalid/);
 assert.throws(()=>service.authorize('invalid',issued.csrfToken),/enrollment_session_invalid/);
});
test('revocation blocks enrollment',()=>{
 const issued=service.establish(token(),{freshProofValidated:true});
 assert.equal(service.revoke(issued.sessionId),true);
 assert.throws(()=>service.authorize(issued.sessionId,issued.csrfToken),/enrollment_session_invalid/);
});
test('expiry blocks enrollment',()=>{
 const issued=service.establish(token(),{freshProofValidated:true});
 now+=300001;
 assert.throws(()=>service.authorize(issued.sessionId,issued.csrfToken),/enrollment_session_invalid/);
 now=start;
});
test('terminal never enabled',()=>assert.throws(()=>service.terminal(),/disabled/));
