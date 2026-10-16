import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirestoreInstitutionContextLoader } from './firestore-gisd-institution-context.mjs';

function mockDb({active=true,membership=true}={}) {
  return {collection(name){
    if(name==='gisdInstitutions') return {doc(id){return {async get(){return {exists:true,data:()=>({status:active?'active':'disabled',name:id})};}};}};
    if(name==='gisdInstitutionMemberships') return {where(){return this;},limit(){return this;},async get(){return {docs:membership?[{data:()=>({subjectId:'member-1',institutionId:'temple-1',role:'institution_admin',active:true})}]:[]};}};
    if(name==='gisdInstitutionReports') return {where(){return this;},limit(){return this;},async get(){return {docs:[{id:'r1',data:()=>({institutionId:'temple-1',visibility:'institution',title:'Annual report'})},{id:'r2',data:()=>({institutionId:'other',visibility:'institution',title:'Wrong institution'})}]};}};
    throw Error('unexpected collection');
  }};
}
test('loads only active member and matching institution reports',async()=>{
 const ctx=await createFirestoreInstitutionContextLoader({db:mockDb()})({subject:'member-1',institutionId:'temple-1'});
 assert.equal(ctx.actor.memberships[0].role,'institution_admin');
 assert.deepEqual(ctx.reporting.map(x=>x.id),['r1']);
});
test('disabled institution denied',async()=>assert.equal(await createFirestoreInstitutionContextLoader({db:mockDb({active:false})})({subject:'member-1',institutionId:'temple-1'}),null));
test('missing membership denied',async()=>assert.equal(await createFirestoreInstitutionContextLoader({db:mockDb({membership:false})})({subject:'member-1',institutionId:'temple-1'}),null));
test('invalid institution id denied',async()=>assert.equal(await createFirestoreInstitutionContextLoader({db:mockDb()})({subject:'member-1',institutionId:'../../root'}),null));
