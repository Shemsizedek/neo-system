import assert from 'node:assert/strict';
import test from 'node:test';
import { createPairingPreview } from './pairing-preview.mjs';

test('explicit approval is required and never enables device control',()=>{
 let time=1_000;const pairing=createPairingPreview(()=>time);
 const created=pairing.create();assert.equal(created.status,201);
 const {id,owner,code}=created.body;
 assert.equal(pairing.approve({id,owner}).status,403);
 assert.equal(pairing.status({id,credential:'forged'}).status,403);
 const join=pairing.join({id,code});assert.equal(join.status,200);
 assert.equal(pairing.status({id,credential:join.body.joiner}).body.state,'awaiting_approval');
 const accepted=pairing.approve({id,owner});
 assert.equal(accepted.body.state,'approved_preview');
 assert.equal(accepted.body.deviceEnrolled,false);
 assert.equal(accepted.body.remoteTerminal,false);
 assert.deepEqual(accepted.body.permissions,[]);
 time+=300001;
 assert.equal(pairing.status({id,credential:owner}).status,403);
});
test('wrong code cannot join and guess attempts are limited',()=>{
 const pairing=createPairingPreview(()=>1000);
 const {id,code}=pairing.create().body;
 for(let i=0;i<5;i++)assert.equal(pairing.join({id,code:'wrong'}).status,403);
 assert.equal(pairing.join({id,code}).status,403);
});

test('approved owner and joiner can exchange only transient ping counters',()=>{
 const pairing=createPairingPreview(()=>1000);
 const {id,owner,code}=pairing.create().body;
 assert.equal(pairing.ping({id,credential:owner}).status,403);
 const {joiner}=pairing.join({id,code}).body;
 assert.equal(pairing.ping({id,credential:joiner}).status,403);
 pairing.approve({id,owner});
 assert.equal(pairing.ping({id,credential:'forged'}).status,403);
 assert.equal(pairing.ping({id,credential:owner}).status,200);
 assert.equal(pairing.signalStatus({id,credential:joiner}).body.received,1);
 assert.equal(pairing.signalStatus({id,credential:owner}).body.received,0);
 assert.equal(pairing.ping({id,credential:joiner}).status,200);
 assert.equal(pairing.signalStatus({id,credential:owner}).body.received,1);
 assert.deepEqual(pairing.ping({id,credential:owner}).body.permissions,[]);
});
