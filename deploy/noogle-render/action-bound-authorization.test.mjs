import assert from 'node:assert/strict';
import test from 'node:test';
import {createActionBoundAuthorization} from './action-bound-authorization.mjs';
test('approvals are action- and payload-specific and one-use',async()=>{
 const issued=new Map();
 const auth=createActionBoundAuthorization({
  issueChallenge:async x=>{issued.set(x.actionHash,{...x,used:false});return {challenge:'nonce',actionHash:x.actionHash};},
  verifyAssertion:async x=>({subject:x.subject,credentialId:x.credentialId,userVerified:true,challenge:'nonce'}),
  consumeChallenge:async x=>{const item=issued.get(x.actionHash);if(!item||item.used)return false;item.used=true;return true;}
 });
 const shared={subject:'member',credentialId:'credential'};
 const rename={...shared,action:'devices.rename',target:'device-1',payload:{label:'Laptop'}};
 const issuedRename=await auth.begin(rename);
 const revoke={...shared,action:'devices.revoke',target:'device-1'};
 assert.equal(await auth.authorize({...revoke,assertion:'assertion'}),false);
 assert.equal(await auth.authorize({...rename,payload:{label:'Other'},assertion:'assertion'}),false);
 assert.equal(await auth.authorize({...rename,assertion:'assertion'}),true);
 assert.equal(await auth.authorize({...rename,assertion:'assertion'}),false);
 assert.equal(issuedRename.actionHash.length,64);
});
test('rejects non-allowlisted actions and malformed operations',async()=>{
 const a=createActionBoundAuthorization({issueChallenge:async()=>({}),verifyAssertion:async()=>null,consumeChallenge:async()=>false});
 await assert.rejects(()=>a.begin({subject:'s',credentialId:'c',action:'terminal.execute'}),/action_not_allowed/);
 await assert.rejects(()=>a.begin({subject:'s',credentialId:'c',action:'devices.rename',target:'x',payload:{}}),/invalid_action_payload/);
});
