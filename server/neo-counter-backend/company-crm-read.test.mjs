import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCompanyCrmReadHandler } from './company-crm-read.mjs';

function fixture(){
  const calls=[];
  const db={collection(name){return {where(field,op,value){calls.push({name,field,op,value});return {orderBy(){return {limit(){return {async get(){return {docs:[{id:'a',data:()=>({companyId:value,name:'Visible'})},{id:'b',data:()=>({companyId:'other',name:'Hidden'})}]}}}}}}}}}}};
  const can=(principal,permission,companyId)=>principal.companyId===companyId&&principal.permissions.includes(permission);
  return {calls,handler:createCompanyCrmReadHandler({db,can})};
}

test('rejects cross-company CRM reads before querying',async()=>{
  const {calls,handler}=fixture();
  const result=await handler({principal:{companyId:'alpha',permissions:['reports']},method:'GET',path:'/v1/counter/companies/beta/customers'});
  assert.equal(result.status,403);
  assert.equal(calls.length,0);
});
test('limits records to the authorized company',async()=>{
  const {calls,handler}=fixture();
  const result=await handler({principal:{companyId:'alpha',permissions:['reports']},method:'GET',path:'/v1/counter/companies/alpha/orders',query:{limit:'500'}});
  assert.equal(result.status,200);
  assert.equal(result.body.limit,100);
  assert.equal(result.body.items.length,1);
  assert.equal(result.body.items[0].companyId,'alpha');
  assert.deepEqual(calls[0],{name:'neo_counter_crm_orders',field:'companyId',op:'==',value:'alpha'});
});
test('memberships require settings permission',async()=>{
  const {handler}=fixture();
  const result=await handler({principal:{companyId:'alpha',permissions:['reports']},method:'GET',path:'/v1/counter/companies/alpha/memberships'});
  assert.equal(result.status,403);
});
