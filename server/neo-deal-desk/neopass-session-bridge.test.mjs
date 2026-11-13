import test from 'node:test';
import assert from 'node:assert/strict';
import {issueNeopassToken} from '../neo-platform-api/neopass-google-auth.mjs';
import {createDealDeskSessionResolver} from './neopass-session-bridge.mjs';
const secret='staging-only-test-secret-not-for-production';
const token=issueNeopassToken({subject:'user-test',secret,now:()=>Date.now()});
test('verified subject derives role from server lookup',async()=>{
 const resolve=createDealDeskSessionResolver({secret,loadMembership:async sub=>({neopassStatus:'active',dealDeskRole:'deal-desk-analyst'})});
 const session=await resolve(token);
 assert.equal(session.subject,'user-test');assert.equal(session.role,'deal-desk-analyst');
});
test('rejects forged token and unapproved roles',async()=>{
 const resolve=createDealDeskSessionResolver({secret,loadMembership:async()=>({neopassStatus:'active',dealDeskRole:'member'})});
 assert.equal(await resolve(token),null);
 assert.equal(await resolve(token+'tamper'),null);
});
test('rejects inactive membership',async()=>{
 const resolve=createDealDeskSessionResolver({secret,loadMembership:async()=>({neopassStatus:'pending',dealDeskRole:'executive-admin'})});
 assert.equal(await resolve(token),null);
});
