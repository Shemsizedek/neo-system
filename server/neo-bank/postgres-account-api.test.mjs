import assert from 'node:assert/strict';
import test from 'node:test';
import {createNeoBankPostgresStore} from './postgres-store.mjs';
const record={id:'id-1',subject:'google:123',account_number:'CES-1234567890',display_name:'Account Owner',email:'owner@example.test',role:'member',balance:'0',credit_limit:'0',status:'active',created_at:'2026-10-29T00:00:00Z'};
const pool={query:async()=>({rows:[record]})};
test('existing account serializes consistently for login and account lookup',async()=>{
 const store=createNeoBankPostgresStore({pool});
 for(const result of [await store.ensureMember({subject:'google:123',email:'owner@example.test'}),await store.accountBySubject('google:123'),await store.account('CES-1234567890')]){
  assert.equal(result.accountNumber,'CES-1234567890');
  assert.equal(result.displayName,'Account Owner');
  assert.equal(result.creditLimit,0);
  assert.equal(result.account_number,'CES-1234567890');
 }
});