import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTeleEnrollment,publicNeoTeleServiceView,deviceCompatibilitySummary} from './enrollment.mjs';
const subject='chaplain-001';
function fixture(overrides={}) {
 const saved=[];const audits=[];
 const dependencies={
  resolveSession:async()=>({verified:true,subject}),
  loadChaplaincyMembership:async()=>({verified:true,subject,status:'ACTIVE',cohort:'chaplaincy'}),
  loadGuardianDevice:async()=>({verified:true,subject,deviceRef:'phone-1',esimSupported:true,unlocked:true}),
  saveRequest:async ({request,idempotencyKey})=>{saved.push({request,idempotencyKey});return request;},
  audit:async x=>audits.push(x),...overrides
 };
 return {enroll:createNeoTeleEnrollment(dependencies),saved,audits};
}
const params={sessionToken:'test-session',deviceRef:'phone-1',idempotencyKey:'request-1'};
test('enroll verified chaplain device and return redacted dashboard',async()=>{
 const f=fixture();const view=await f.enroll(params);
 assert.equal(view.state,'REQUESTED');assert.equal(view.activationAvailable,false);
 assert.equal(view.eSimStatus,'NOT_ACTIVE');assert.equal(f.saved.length,1);assert.equal(f.audits.length,1);
 assert.equal('profileId' in view,false);
});
test('reject unverified sessions',async()=>{
 const f=fixture({resolveSession:async()=>({subject,verified:false})});
 await assert.rejects(()=>f.enroll(params),/neopass_authentication_required/);
 assert.equal(f.saved.length,0);
});
test('reject forged/nonchaplain membership',async()=>{
 const f=fixture({loadChaplaincyMembership:async()=>({verified:true,subject,status:'ACTIVE',cohort:'public'})});
 await assert.rejects(()=>f.enroll(params),/chaplaincy_membership_required/);
});
test('reject foreign or unsupported device',async()=>{
 const f=fixture({loadGuardianDevice:async()=>({verified:true,subject:'another',deviceRef:'phone-1',esimSupported:true,unlocked:true})});
 await assert.rejects(()=>f.enroll(params),/guardian_device_not_eligible/);
});
test('never show another member their service',()=>{
 assert.throws(()=>publicNeoTeleServiceView({memberId:subject,state:'ACTIVE'},'other'),/service_access_denied/);
});
test('device checks require verified eligibility',()=>{
 assert.equal(deviceCompatibilitySummary({verified:false,esimSupported:true,unlocked:true}).eligible,false);
 assert.equal(deviceCompatibilitySummary({verified:true,esimSupported:true,unlocked:true}).eligible,true);
});
