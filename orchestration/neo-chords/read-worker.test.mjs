import test from 'node:test';
import assert from 'node:assert/strict';
import {createChordsReadWorker} from './read-worker.mjs';
function makeRouter(){
  let calls=0;
  return {router:{
    async capabilityStatus(subject,capability){assert.equal(subject,'test-subject');return {capability,classification:'read',health:'ready'}},
    async execute(subject,request){calls++;return {ok:true,capability:request.capability,provider:'mock-authorized',data:{repositories:[]}}}
  },getCalls:()=>calls};
}
test('approved public read-only capability reuses NEO command router',async()=>{
  const {router,getCalls}=makeRouter();
  const worker=createChordsReadWorker({commandRouter:router,subject:'test-subject',allowedCapabilities:['development.repositories.list']});
  assert.deepEqual(await worker.run({capability:'development.repositories.list'}),{capability:'development.repositories.list',provider:'mock-authorized',data:{repositories:[]},readOnly:true});
  assert.equal(getCalls(),1);
});
test('unregistered capability never reaches provider',async()=>{
  const {router,getCalls}=makeRouter();
  const worker=createChordsReadWorker({commandRouter:router,subject:'test-subject',allowedCapabilities:['development.repositories.list']});
  await assert.rejects(worker.run({capability:'development.issues.create'}),/denied/);
  assert.equal(getCalls(),0);
});
test('rejects non-read capability even if allowlisted',async()=>{
  const {router}=makeRouter();router.capabilityStatus=async()=>({classification:'write',health:'ready'});
  const worker=createChordsReadWorker({commandRouter:router,subject:'test-subject',allowedCapabilities:['development.repositories.list']});
  await assert.rejects(worker.run({capability:'development.repositories.list'}),/unavailable/);
});
test('verified subject and explicit allowlist required',()=>{
  const {router}=makeRouter();
  assert.throws(()=>createChordsReadWorker({commandRouter:router}),/authenticated_subject_required/);
  assert.throws(()=>createChordsReadWorker({commandRouter:router,subject:'x',allowedCapabilities:['*']}),/invalid_capability_allowlist/);
});
test('refuses internal data and nonempty outbound parameters by default',async()=>{
  const {router,getCalls}=makeRouter();
  const worker=createChordsReadWorker({commandRouter:router,subject:'test-subject',allowedCapabilities:['development.repositories.list']});
  await assert.rejects(worker.run({capability:'development.repositories.list',dataClass:'internal'}),/external_data_class_denied/);
  await assert.rejects(worker.run({capability:'development.repositories.list',parameters:{secret:'do not send'}}),/unapproved_read_parameters/);
  assert.equal(getCalls(),0);
});
