import test from 'node:test';import assert from 'node:assert/strict';
import {createEnrollmentService,createReadOnlySessionService} from './enrollment-session.mjs';
const now=1700000000000;
function fixture(){const challenges=new Map(),credentials=new Map(),sessions=new Map();
 const challengeStore={async issue(k,v){if(challenges.has(k))throw Error('Duplicate');challenges.set(k,v)},async consume(k){const v=challenges.get(k);challenges.delete(k);return v}};
 const credentialRepository={async create(c){if(credentials.has(c.id))throw Error('Duplicate credential');credentials.set(c.id,c)}};
 const verifyRegistration=async()=>({verified:true,userVerified:true,credential:{id:'cred-1',publicKey:[1,2,3],counter:0}});
 return {enrollment:createEnrollmentService({challengeStore,credentialRepository,verifyRegistration,origin:'https://counterpay.example',rpID:'counterpay.example',now:()=>now}),credentials,sessions:createReadOnlySessionService({sessions:{async create(v){sessions.set(v.token,v)},async get(k){return sessions.get(k)},async revoke(k){sessions.delete(k)}},now:()=>now})};
}
test('registration is single use and belongs to authenticated user',async()=>{const f=fixture();const x=await f.enrollment.begin({userId:'member-1'});const receipt=await f.enrollment.finish({userId:'member-1',challenge:x.challenge,response:{}});assert.equal(receipt.registered,true);assert.equal(f.credentials.get('cred-1').userId,'member-1');await assert.rejects(f.enrollment.finish({userId:'member-1',challenge:x.challenge,response:{}}),/expired/);});
test('wrong member consumes registration challenge',async()=>{const f=fixture();const x=await f.enrollment.begin({userId:'member-1'});await assert.rejects(f.enrollment.finish({userId:'member-2',challenge:x.challenge,response:{}}),/mismatch/);});
test('verified auth creates only read scope, logout revokes',async()=>{const f=fixture();const auth={schema:'neo.pass.webauthn-review.v1',authenticated:true,bitcoinSigned:false,broadcast:false};const s=await f.sessions.establish({userId:'member-1',authentication:auth});assert.equal((await f.sessions.check({token:s.token,userId:'member-1'})).canSign,false);await f.sessions.logout({token:s.token});await assert.rejects(f.sessions.check({token:s.token,userId:'member-1'}),/invalid/);});
test('unverified authentication cannot create session',async()=>{const f=fixture();await assert.rejects(f.sessions.establish({userId:'member-1',authentication:{authenticated:true}}),/Verified/)});
