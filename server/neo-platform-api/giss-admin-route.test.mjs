import test from 'node:test';
import assert from 'node:assert/strict';
import { createGisdAdminRoute } from './giss-admin-route.mjs';

function response(){return {status:0,body:'',writeHead(status){this.status=status;},end(body){this.body=body;}};}
const actor={subjectId:'member-a',memberships:[{institutionId:'temple-a',role:'institution_admin',active:true}]};
const loader=async()=>({actor,institution:{id:'temple-a',name:'Temple A'},reporting:[]});
test('authorized school admin route renders dashboard',async()=>{
 const res=response(),handle=createGisdAdminRoute({subjectResolver:()=> 'member-a',loadInstitutionContext:loader});
 assert.equal(await handle({method:'GET'},res,new URL('http://localhost/portal/school/admin?institutionId=temple-a')),true);
 assert.equal(res.status,200);
 assert.match(res.body,/NEO Cipher Admin Dashboard/);
});
test('unauthenticated user denied',async()=>{
 const res=response(),handle=createGisdAdminRoute({subjectResolver:()=>null,loadInstitutionContext:loader});
 await handle({method:'GET'},res,new URL('http://localhost/portal/school/admin?institutionId=temple-a'));
 assert.equal(res.status,401);
});
test('cross institution denied',async()=>{
 const res=response(),handle=createGisdAdminRoute({subjectResolver:()=> 'member-a',loadInstitutionContext:loader});
 await handle({method:'GET'},res,new URL('http://localhost/portal/school/admin?institutionId=temple-b'));
 assert.equal(res.status,403);
});
test('untrusted actor identity denied',async()=>{
 const res=response(),handle=createGisdAdminRoute({subjectResolver:()=> 'member-b',loadInstitutionContext:loader});
 await handle({method:'GET'},res,new URL('http://localhost/portal/school/admin?institutionId=temple-a'));
 assert.equal(res.status,403);
});
