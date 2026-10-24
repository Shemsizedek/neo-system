import test from 'node:test';
import assert from 'node:assert/strict';
import {NEOTELE_PILOT_OPTIONS,listNeoTeleTrialOptions,createNeoTelePilotEvaluation} from './free-pilot-options.mjs';
test('verified trial categories do not claim eSIM issuer privileges',()=>{
 const trials=listNeoTeleTrialOptions({kind:'FREE_NETWORK_TRIAL'});
 assert.equal(trials.length,3);
 assert.equal(trials.every(t=>t.carrierApiAccess===false),true);
 assert.equal(trials.find(t=>t.id==='usmobile-trial').requiresPortIn,true);
});
test('Lifeline routes require separate eligibility and eSIM verification',()=>{
 const plans=listNeoTeleTrialOptions({kind:'LIFELINE_REFERRAL'});
 assert.equal(plans.length,3);
 assert.equal(plans.every(p=>p.esimAvailability==='VERIFY_WITH_PROVIDER'),true);
});
test('third party service cannot become NeoTele-issued tokenized eSIM',()=>{
 const x=createNeoTelePilotEvaluation({optionId:'verizon-trial',deviceCompatibilityVerified:true,carrierEnrollmentConfirmed:true});
 assert.equal(x.networkOperational,true);
 assert.equal(x.neoTeleProviderProvisioned,false);
 assert.equal(x.neoTeleTokenPublished,false);
 assert.equal(x.activationCredentialsStored,false);
});
test('external trial without eligibility remains inactive',()=>{
 assert.equal(createNeoTelePilotEvaluation({optionId:'tmobile-trial'}).networkOperational,false);
 assert.throws(()=>createNeoTelePilotEvaluation({optionId:'unknown'}),/unsupported_service_option/);
});
