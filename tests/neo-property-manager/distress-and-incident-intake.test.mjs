import test from 'node:test';
import assert from 'node:assert/strict';
import {intakeSource,summarizeIncident,prioritizeReview,privateRecordCommitment,
  managerActivation} from '../../server/neo-property-manager/distress-and-incident-intake.mjs';
const sample={
  assetRef:'SYNTHETIC-ALGERIAN-PARCEL',recordId:'TEST-IMAGE-1',
  sourceKind:'PROPERTY_PHOTOGRAPH',sourceRef:'synthetic:internal-image',
  originalSha256:'ab'.repeat(32),recordedAt:'2026-11-10T12:00:00Z',
  reportedEventKind:'DAMAGE_DISCOVERED',relation:'REPORTED_AFTER_INCIDENT'
};
test('reported post-event property damage is retained as an allegation, not attribution',()=>{
  const s=intakeSource(sample);
  const summary=summarizeIncident(s);
  assert.equal(s.titleEffect,'NONE_INFERRED');
  assert.equal(summary.independentCausationConfirmed,false);
  assert.equal(summary.suitableForPublicAccusation,false);
  assert.equal(summary.evidentiaryStatus,'SOURCE_ACCOUNT_ONLY');
});
test('city report is still not verified merely because a caller labels the origin',()=>{
  const r=prioritizeReview([intakeSource({...sample,recordId:'CODE-1',sourceKind:'CITY_CODE_ENFORCEMENT'})]);
  assert.equal(r.reason,'OFFICIAL_SOURCE_PRESENT_FOR_AUTHENTICATION');
  assert.equal(r.officialDistressFindingAuthenticated,false);
  assert.equal(r.rightToEnter,false);
});
test('utility/vacancy photographs never establish abandonment',()=>{
  const r=prioritizeReview([intakeSource(sample)]);
  assert.equal(r.reason,'OBSERVATION_ONLY');
  assert.equal(r.titleVerified,false);
  assert.equal(r.automaticConsent,false);
});
test('public commitment does not reveal private report facts',()=>{
  const rec=intakeSource({...sample,note:'PRIVATE TEST CASE DETAILS'});
  const receipt=privateRecordCommitment(rec,'cf'.repeat(32));
  assert.equal(receipt.status,'NOT_PUBLISHED');
  assert.equal(JSON.stringify(receipt).includes('PRIVATE TEST CASE DETAILS'),false);
  assert.equal(JSON.stringify(receipt).includes('SYNTHETIC-ALGERIAN-PARCEL'),false);
});
test('manager requires verified mandate and supervisor approval',()=>{
  assert.equal(managerActivation().maintenanceActive,false);
  assert.equal(managerActivation({verifiedControl:true,signedMandate:true}).maintenanceActive,false);
  assert.equal(managerActivation({verifiedControl:true,signedMandate:true,supervisorApproved:true}).maintenanceActive,true);
  assert.equal(managerActivation({verifiedControl:true,signedMandate:true,supervisorApproved:true}).managedRentAndLeasingActive,false);
  assert.equal(managerActivation({verifiedControl:true,signedMandate:true,supervisorApproved:true,regulatedFunctionsCleared:true}).managedRentAndLeasingActive,true);
  assert.equal(managerActivation({verifiedControl:true,signedMandate:true,supervisorApproved:true,regulatedFunctionsCleared:true}).propertyEntryAllowed,false);
});
test('reject made-up regulatory source and invalid hashes',()=>{
  assert.throws(()=>intakeSource({...sample,sourceKind:'TITLE_SELF_GRANTED'}),/invalid source/);
  assert.throws(()=>intakeSource({...sample,originalSha256:'fake'}),/SHA-256/);
});
