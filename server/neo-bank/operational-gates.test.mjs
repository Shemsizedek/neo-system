import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationDecision,tellerIdentityBridge} from './operational-gates.mjs';
test('approved queue record alone cannot broadcast',()=>{
 const record={status:'APPROVED',approved:true,submitted:false,digest:'sha256:'+'a'.repeat(64)};
 assert.throws(()=>publicationDecision(record),/crown_publisher_not_authorized/);
 assert.throws(()=>publicationDecision({...record,status:'REJECTED'},{authorized:true,publisher:()=>{}}),/crown_request_not_publishable/);
 assert.equal(publicationDecision(record,{authorized:true,publisher:()=>{}}).canBroadcast,false);
});
test('Teller identity bridge consumes a verified subject-matched assertion',async()=>{
 const result=await tellerIdentityBridge('opaque',{expectedSubject:'google:member01',verifyAssertion:async()=>({verified:true,subject:'google:member01',jti:'one'}),consume:async()=>({verified:true,sessionId:'session-0001'})});
 assert.equal(result.canSign,false);
 await assert.rejects(tellerIdentityBridge('opaque',{expectedSubject:'google:member02',verifyAssertion:async()=>({verified:true,subject:'google:member01'}),consume:async()=>({verified:true})}),/teller_session_invalid/);
 await assert.rejects(tellerIdentityBridge('opaque',{}),/teller_bridge_not_configured/);
});
