import test from 'node:test';import assert from 'node:assert/strict';import {createTerminalApproval} from './terminal-approval.mjs';
test('approval is device, identity and command bound and consumed once',()=>{
 const a=createTerminalApproval();const r=a.request({subject:'owner',device:'chromebook',command:'pwd'});
 assert.throws(()=>a.consume({...r,subject:'owner'}),/session_not_authorized/);
 assert.throws(()=>a.approve({id:r.id,subject:'attacker',device:'chromebook'}),/approval_denied/);
 a.approve({id:r.id,subject:'owner',device:'chromebook'});
 assert.throws(()=>a.consume({...r,subject:'owner',command:'whoami'}),/session_not_authorized/);
 assert.deepEqual(a.consume({...r,subject:'owner'}),{subject:'owner',device:'chromebook',command:'pwd'});
 assert.throws(()=>a.consume({...r,subject:'owner'}),/session_not_authorized/);
});
test('expired approval cannot be used',()=>{
 let now=10;const a=createTerminalApproval({now:()=>now,ttlMs:50});
 const r=a.request({subject:'owner',device:'chromebook',command:'pwd'});now=61;
 assert.throws(()=>a.approve({id:r.id,subject:'owner',device:'chromebook'}),/approval_denied/);
});
