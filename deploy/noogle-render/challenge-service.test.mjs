import assert from 'node:assert/strict';
import test from 'node:test';
import {createChallengeService} from './challenge-service.mjs';
import {createPostgresChallengeStore} from './postgres-challenge-store.mjs';

test('one-time challenges are scope-bound, consumed once and expire',async()=>{
 let now=1000;const records=new Map();
 const store={
  async insert(row){records.set(row.challengeHash,{...row,consumed:false});},
  async consumeAtomic(p){
   const r=records.get(p.challengeHash);
   if(!r||r.consumed||r.expiresAt<=p.now||r.subject!==p.subject||
      r.credentialId!==p.credentialId||r.purpose!==p.purpose||
      r.rpId!==p.rpId||r.origin!==p.origin)return false;
   r.consumed=true;return true;
  }
 };
 const service=createChallengeService({store,now:()=>now});
 const scope={subject:'person-1',credentialId:'cred-1',purpose:'authenticate',rpId:'connect.example.test',origin:'https://connect.example.test'};
 const issued=await service.issue(scope);assert.equal(issued.challenge.length,43);
 assert.equal(await service.consume({...scope,challenge:issued.challenge,subject:'other'}),false);
 assert.equal(await service.consume({...scope,challenge:issued.challenge}),true);
 assert.equal(await service.consume({...scope,challenge:issued.challenge}),false);
 const second=await service.issue(scope);now+=120001;
 assert.equal(await service.consume({...scope,challenge:second.challenge}),false);
 assert.ok([...records.values()].every(r=>!('challenge' in r)));
});
test('SQL adapter never interpolates user input and uses one atomic UPDATE',async()=>{
 const calls=[];const db={query:async(sql,args)=>{calls.push({sql,args});return {rows:[{challenge_hash:'a'}]};}};
 const store=createPostgresChallengeStore(db);
 const subject="someone'; DROP TABLE t; --";
 await store.insert({challengeHash:'h',subject,credentialId:'c',purpose:'register',rpId:'x',origin:'https://x',expiresAt:100});
 assert.equal(await store.consumeAtomic({challengeHash:'h',subject,credentialId:'c',purpose:'register',rpId:'x',origin:'https://x',now:50}),true);
 assert.ok(calls.every(c=>!c.sql.includes(subject)));
 assert.match(calls[1].sql,/consumed_at IS NULL RETURNING/);
 assert.match(calls[1].sql,/IS NOT DISTINCT FROM/);
});
