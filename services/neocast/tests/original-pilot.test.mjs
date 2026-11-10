import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOriginalPilot, estimateCapacity, loadCanonicalPilot } from '../original-pilot.mjs';

const clone = value => structuredClone(value);

test('default World Temple original pilot is prelaunch, rights pending, not public',()=>{
 const plan=assessOriginalPilot(loadCanonicalPilot());
 assert.equal(plan.pilotId,'world-temple-education-001');
 assert.equal(plan.policyConsistent,true);
 assert.equal(plan.preflightStatus,'DRAFT_ACCEPTED');
 assert.equal(plan.publicBroadcastAuthorized,false);
 assert.equal(plan.actualOnNetworkAcceptanceVerified,false);
 assert.equal(plan.operationalProofChecked,false);
 assert.equal(plan.capacityEstimate.measured,false);
 assert.ok(plan.contentAndRightsGaps.length >= 18);
});

test('capacity model separates ingest from viewer egress',()=>{
 const estimate=estimateCapacity({
  concurrentViewers:10,averageTotalBitrateKbps:1500,
  egressHeadroomFactor:1.3,ingestHeadroomFactor:1.5
 },30);
 assert.equal(estimate.estimatedSustainedOriginEgressMbps,15);
 assert.equal(estimate.recommendedOriginEgressCapacityMbps,19.5);
 assert.equal(estimate.recommendedPublisherUploadMbps,2.25);
 assert.equal(estimate.estimatedMediaTransferGBDecimal,3.375);
 assert.equal(estimate.provisionedTransferAllowanceGBDecimal,4.388);
 assert.equal(estimate.costEstimated,false);
});
test('bad capacity and duration assumptions reject rather than assert readiness',()=>{
 const p=loadCanonicalPilot();
 for (const viewerCount of [0,-2,0.5,Infinity,10000000]) {
   assert.throws(()=>estimateCapacity({...p.audienceCapacityEstimate,concurrentViewers:viewerCount},p.schedule.durationMinutes));
 }
 assert.throws(()=>estimateCapacity(p.audienceCapacityEstimate,-1));
 assert.throws(()=>estimateCapacity({...p.audienceCapacityEstimate,egressHeadroomFactor:0.5},30));
});
test('no source-control booleans can mark gate 002 publicly live',()=>{
 const p=clone(loadCanonicalPilot());
 p.release.live=true;
 assert.ok(assessOriginalPilot(p).violations.includes('publication_or_payment_claim_forbidden'));
 p.release.live=false;
 p.phase='live';
 assert.ok(assessOriginalPilot(p).violations.includes('public_or_unknown_phase_forbidden_in_gate_002'));
 p.phase='draft';
 p.delivery.publicEndpoint='https://example.org/index.m3u8';
 assert.ok(assessOriginalPilot(p).violations.includes('public_media_endpoint_forbidden_in_gate_002'));
});
test('no paid services, financial transactions, monetization or automated publishing allowed',()=>{
 const p=clone(loadCanonicalPilot());
 p.governance.newPaidResourcesAuthorized=true;
 p.rights.advertisingOrMonetizationAuthorized=true;
 p.release.acceptingPayments=true;
 p.release.automaticPublishing=true;
 const err=assessOriginalPilot(p).violations;
 assert.ok(err.includes('new_paid_resource_approval_forbidden'));
 assert.ok(err.includes('monetization_forbidden_in_gate_002'));
 assert.ok(err.includes('publication_or_payment_claim_forbidden'));
});
test('missing off-state cannot silently enable a broadcast',()=>{
 const p=clone(loadCanonicalPilot());
 delete p.release.recordingEnabled;
 assert.ok(assessOriginalPilot(p).violations.includes('publication_or_payment_claim_forbidden'));
});
test('rights, schedule, security and operator evidence remain mandatory',()=>{
 const p=clone(loadCanonicalPilot());
 const result=assessOriginalPilot(p);
 const keys=new Set(result.contentAndRightsGaps.map(x=>x.key));
 for (const required of [
  'content.ownerIdentityVerified','content.participantsAndLocationsConsented',
  'rights.ownedOrLicensed','rights.signedLicenseEvidenceReference',
  'schedule.startIso','schedule.operatorApprovalReference',
  'delivery.actualEndToEndPlaybackVerified','delivery.revocationOrTakedownTested',
  'delivery.measuredEgressMbps','governance.neoLawApproved','governance.siteNetworkOwnerAuthorized'
 ]) assert.ok(keys.has(required),required);
});
test('bogus time, rights territory or media hash blocks consistency',()=>{
 const p=clone(loadCanonicalPilot());
 p.schedule.startIso='tomorrow';
 p.content.sourceAssetSha256='abc';
 p.rights.authorizedTerritories=['US'];
 const err=assessOriginalPilot(p).violations;
 assert.ok(err.includes('schedule_requires_valid_offset_datetime'));
 assert.ok(err.includes('source_hash_must_be_sha256_hex'));
 assert.ok(err.includes('unlicensed_distribution_cannot_specify_rights_territories'));
});
test('even declarative approved flags cannot claim an actual network test',()=>{
 const p=clone(loadCanonicalPilot());
 p.content.sourceAssetProvided=true;
 p.content.ownerIdentityVerified=true;
 p.content.participantsAndLocationsConsented=true;
 p.content.thirdPartyMaterialCleared=true;
 p.rights.ownedOrLicensed=true;
 p.rights.liveDistributionAuthorized=true;
 p.governance.neoLawApproved=true;
 p.delivery.persistentOriginVerified=true;
 p.delivery.actualEndToEndPlaybackVerified=true;
 const result=assessOriginalPilot(p);
 assert.equal(result.publicBroadcastAuthorized,false);
 assert.equal(result.actualOnNetworkAcceptanceVerified,false);
 assert.equal(result.operationalProofChecked,false);
});
