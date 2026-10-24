import test from 'node:test';
import assert from 'node:assert/strict';
import {NOOGLE_TELECOM,PILOT_SERVICE,getNoogleProviderDirectory,validateNoogleCarrierEvidence} from './noogle-telecommunications.mjs';
test('Noogle is designated without falsely claiming active carrier rights',()=>{
 const d=getNoogleProviderDirectory();
 assert.equal(d.operator.id,'noogle-telecommunications');
 assert.equal(d.operator.operations,'SANDBOX_ONLY');
 assert.equal(d.status,'NOT_READY_FOR_ENROLLMENT');
 assert.equal(d.plans[0].available,false);
 assert.equal(NOOGLE_TELECOM.lifelineEtcVerified,false);
 assert.equal(PILOT_SERVICE.esimDelivery,'DISABLED');
});
test('reject undocumented partner capacity or Lifeline claims',()=>{
 assert.throws(()=>validateNoogleCarrierEvidence({providerId:NOOGLE_TELECOM.id}),/carrier_contract_and_provisioning_not_verified/);
 assert.throws(()=>validateNoogleCarrierEvidence({providerId:NOOGLE_TELECOM.id,contractVerified:true,carrierProvisioningVerified:true,lifelineOffering:true}),/lifeline_authorization_not_verified/);
});
test('even approved partner evidence cannot bypass release gate',()=>{
 const outcome=validateNoogleCarrierEvidence({providerId:NOOGLE_TELECOM.id,contractVerified:true,carrierProvisioningVerified:true,lifelineOffering:false});
 assert.equal(outcome.liveProvisioningEnabled,false);
});
