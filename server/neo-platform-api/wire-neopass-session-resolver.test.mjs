import test from 'node:test';
import assert from 'node:assert/strict';
import {createWireNeopassSessionResolver} from './wire-neopass-session-resolver.mjs';
test('requires actual session service',()=>assert.throws(()=>createWireNeopassSessionResolver({subjectResolver:()=> 's'}),/verified_neopass_session_service_required/));
test('missing subject cannot authorize',async()=>{
 let called=false;
 const resolve=createWireNeopassSessionResolver({subjectResolver:()=>null,authService:{session:async()=>{called=true;return {}}}});
 assert.equal(await resolve({}),null);assert.equal(called,false);
});
test('unauthenticated session rejected',async()=>{
 const resolve=createWireNeopassSessionResolver({subjectResolver:()=> 's',authService:{session:async()=>({subject:'s',neopassStatus:'pending'})}});
 assert.equal(await resolve({}),null);
});
test('verified server session provides member identity',async()=>{
 const resolve=createWireNeopassSessionResolver({subjectResolver:()=> 'trusted-subject',authService:{session:async subject=>({subject,neopassStatus:'authenticated'})}});
 assert.deepEqual(await resolve({}),{id:'trusted-subject'});
});
test('session without member identifier rejected',async()=>{
 const resolve=createWireNeopassSessionResolver({subjectResolver:()=> 's',authService:{session:async()=>({neopassStatus:'authenticated'})}});
 assert.equal(await resolve({}),null);
});
