import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNeoTeleOnboarding,advanceNeoTeleOnboarding,publicNeoTeleOnboarding} from './lifeline-onboarding.mjs';
const base=()=>makeNeoTeleOnboarding({memberId:'chaplain-1',deviceRef:'phone-1',zipCode:'27260'});
test('ZIP and membership are mandatory',()=>{
 assert.throws(()=>makeNeoTeleOnboarding({memberId:'m',deviceRef:'d',zipCode:'invalid'}),/valid_zip_required/);
 assert.equal(base().step,'DEVICE_CHECK');
});
test('refuse fake carrier or eSIM approval',()=>{
 const b=base();
 assert.throws(()=>advanceNeoTeleOnboarding(b,'PROVIDER_SELECTION'),/verified_device_required/);
 const next=advanceNeoTeleOnboarding(b,'PROVIDER_SELECTION',{device:{verified:true,esimSupported:true,unlocked:true}});
 assert.throws(()=>advanceNeoTeleOnboarding(next,'ELIGIBILITY_REFERRAL',{provider:{authorized:false,coversZip:true,offersEsim:true}}),/verified_provider_required/);
});
test('no activation until every provider checkpoint',()=>{
 let r=base();
 r=advanceNeoTeleOnboarding(r,'PROVIDER_SELECTION',{device:{verified:true,esimSupported:true,unlocked:true}});
 r=advanceNeoTeleOnboarding(r,'ELIGIBILITY_REFERRAL',{provider:{id:'authorized-partner',authorized:true,coversZip:true,offersEsim:true}});
 r=advanceNeoTeleOnboarding(r,'APPLICATION_REVIEW',{eligibility:{referralAcknowledged:true}});
 assert.throws(()=>advanceNeoTeleOnboarding(r,'CARRIER_APPROVAL'),/carrier_approval_required/);
 r=advanceNeoTeleOnboarding(r,'CARRIER_APPROVAL',{carrier:{approvalVerified:true,applicationRef:'a1'}});
 assert.throws(()=>advanceNeoTeleOnboarding(r,'ESIM_DELIVERY'),/carrier_profile_delivery_required/);
 r=advanceNeoTeleOnboarding(r,'ESIM_DELIVERY',{carrier:{profileDeliveryConfirmed:true}});
 r=advanceNeoTeleOnboarding(r,'DEVICE_INSTALL',{carrier:{installationConfirmed:true}});
 assert.throws(()=>advanceNeoTeleOnboarding(r,'ACTIVATION_CONFIRMATION'),/carrier_network_activation_required/);
 r=advanceNeoTeleOnboarding(r,'ACTIVATION_CONFIRMATION',{carrier:{networkActivationVerified:true}});
 assert.equal(r.serviceStatus,'ACTIVE');
});
test('member projection does not reveal application references or phone identifiers',()=>{
 const r=base();const v=publicNeoTeleOnboarding(r,'chaplain-1');
 assert.equal(v.serviceStatus,'NOT_ACTIVE');
 assert.equal('applicationRef' in v,false);
 assert.throws(()=>publicNeoTeleOnboarding(r,'other'),/onboarding_access_denied/);
});
