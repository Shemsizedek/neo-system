import test from 'node:test';
import assert from 'node:assert/strict';
import {issueTellerAssertion,verifyTellerAssertion} from './teller-assertion.mjs';
const secret='this-is-a-test-only-32-byte-secret-with-plenty-of-entropy';
test('authenticated teller assertions are audience-bound and short-lived',()=>{
 const token=issueTellerAssertion({subject:'google:person_123',sessionId:'teller-session-01'},{secret,now:()=>10000});
 const proof=verifyTellerAssertion(token,{secret,now:()=>10001});
 assert.equal(proof.subject,'google:person_123');
 assert.equal(proof.canBroadcast,false);
 assert.throws(()=>verifyTellerAssertion(token,{secret,now:()=>140001}),/teller_session_invalid/);
});
test('teller assertions reject tampering and missing issuer credentials',()=>{
 const token=issueTellerAssertion({subject:'google:person_123',sessionId:'teller-session-01'},{secret});
 assert.throws(()=>verifyTellerAssertion(token+'x',{secret}),/teller_session_invalid/);
 assert.throws(()=>issueTellerAssertion({subject:'google:person_123',sessionId:'teller-session-01'}),/teller_issuer_not_configured/);
});
