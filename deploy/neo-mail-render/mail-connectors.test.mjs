import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMailRouter,createTitanConnector} from './mail-connectors.mjs';

const grant={provider:'titan',capability:'inbound-read',verified:true,subject:'member-1',mailbox:'chaplain@holytemples.org'};
const identity={verified:true,subject:'member-1',mailbox:'chaplain@holytemples.org'};
test('routing denies missing grants or identity before connector use',async()=>{
 let calls=0;
 const router=createMailRouter({verifyIdentity:async credentials=>credentials?.token==='test-valid-token'?identity:null,connectors:{titan:{readInbox:async()=>{calls++;return [];}}}});
 assert.equal((await router.readInbox({provider:'titan',identity:{token:'test-valid-token'}})).reason,'authorization_required');
 assert.equal((await router.readInbox({provider:'titan',grant,identity:{token:'invalid'}})).reason,'identity_not_verified');
 assert.equal((await router.readInbox({provider:'titan',grant,identity:{token:'invalid'}})).reason,'identity_not_verified');
 assert.equal((await router.readInbox({provider:'titan',grant,identity:{token:'invalid'}})).reason,'identity_not_verified');
 assert.equal(calls,0);
});
test('routing permits only explicitly injected provider',async()=>{
 const router=createMailRouter({verifyIdentity:async credentials=>credentials?.token==='test-valid-token'?identity:null,connectors:{titan:{readInbox:async()=>[{uid:3}]}}});
 assert.deepEqual(await router.readInbox({provider:'titan',grant,identity:{token:'test-valid-token'}}),{ok:true,provider:'titan',messages:[{uid:3}]});
 assert.equal((await createMailRouter().readInbox({provider:'titan',grant,identity:{token:'test-valid-token'}})).reason,'identity_not_verified');
 assert.equal((await createMailRouter({verifyIdentity:async()=>identity}).readInbox({provider:'titan',grant,identity:{token:'test-valid-token'}})).reason,'connector_unavailable');
 assert.equal((await router.readInbox({provider:'wpvibe',grant,identity:{token:'test-valid-token'}})).reason,'unsupported_capability');
});
test('Titan mailbox scope refuses cross-tenant access before connect',async()=>{
 let calls=0;
 const connector=createTitanConnector({env:{TITAN_IMAP_USER:'chaplain@holytemples.org',TITAN_IMAP_APP_PASSWORD:'dummy'},clientFactory:async()=>{calls++;throw Error('unexpected')}});
 await assert.rejects(()=>connector.readInbox({mailbox:'other@example.com'}),/mailbox_scope_mismatch/);
 assert.equal(calls,0);
});
