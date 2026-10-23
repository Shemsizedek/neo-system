import test from 'node:test';
import assert from 'node:assert/strict';
import {requestNeoTeleService,transitionNeoTeleService,describeNeoTeleIntegration} from './core.mjs';

const eligible={deviceRef:'neo-device-001',esimSupported:true,unlocked:true};
test('pilot is restricted to Chaplaincy members',()=>{
 assert.throws(()=>requestNeoTeleService({memberId:'m1',cohort:'public',device:eligible}),/pilot_cohort_restricted/);
 assert.throws(()=>requestNeoTeleService({cohort:'chaplaincy',device:eligible}),/verified_member_required/);
});
test('request requires eligible eSIM device',()=>{
 assert.throws(()=>requestNeoTeleService({memberId:'m1',cohort:'chaplaincy',device:{esimSupported:false,unlocked:true}}),/device_eligibility_pending/);
});
test('request does not pretend a carrier profile was issued',()=>{
 const request=requestNeoTeleService({memberId:'m1',cohort:'chaplaincy',device:eligible});
 assert.equal(request.state,'REQUESTED');
 assert.equal(request.providerId,null);
 assert.equal(request.profileId,null);
 assert.equal(request.phoneNumber,null);
});
test('carrier verification is mandatory for eSIM readiness and activation',()=>{
 let record=requestNeoTeleService({memberId:'m1',cohort:'chaplaincy',device:eligible});
 record=transitionNeoTeleService(record,'ELIGIBILITY_PENDING');
 record=transitionNeoTeleService(record,'ELIGIBLE');
 record=transitionNeoTeleService(record,'PROVIDER_PENDING');
 assert.throws(()=>transitionNeoTeleService(record,'READY_FOR_ACTIVATION'),/verified_carrier_provisioning_required/);
 record=transitionNeoTeleService(record,'READY_FOR_ACTIVATION',{providerEvidence:{verified:true}});
 assert.throws(()=>transitionNeoTeleService(record,'ACTIVE',{providerEvidence:{verified:true}}),/activation_not_confirmed/);
 assert.equal(transitionNeoTeleService(record,'ACTIVE',{providerEvidence:{verified:true,activationConfirmed:true}}).state,'ACTIVE');
});
test('no activation paths bypass lifecycle',()=>{
 const request=requestNeoTeleService({memberId:'m1',cohort:'chaplaincy',device:eligible});
 assert.throws(()=>transitionNeoTeleService(request,'ACTIVE',{providerEvidence:{verified:true,activationConfirmed:true}}),/transition_not_permitted/);
 assert.equal(describeNeoTeleIntegration().activation,'disabled');
});
