import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAndroidPilot,normalizeNetworkObservation} from './android-pilot.mjs';
test('first phone checklist prevents unconfirmed trial activation',()=>{
 const r=evaluateAndroidPilot({carrierOptionId:'verizon-trial',euiccEnabled:true,carrierUnlocked:true,wifiAvailable:true,trialEligible:false,diagnosticsConsent:true});
 assert.equal(r.readyForCarrierSelfEnrollment,false);assert.equal(r.carrierProfileInstallationEnabled,false);
});
test('no diagnostics without consent or sensitive identifiers',()=>{
 assert.throws(()=>normalizeNetworkObservation({consent:false}),/diagnostics_consent_required/);
 const r=normalizeNetworkObservation({consent:true,observedAt:'2026-10-24T13:00:00Z',transport:'CELLULAR',signalLevel:3,validated:true,imei:'secret'});
 assert.equal(r.imei,null);assert.equal(JSON.stringify(r).includes('secret'),false);assert.equal(r.carrierControl,false);
});
