import test from 'node:test';
import assert from 'node:assert/strict';
import {createAcquisitionEvent,summarizeAdministrativeChronology} from '../../server/neo-property-manager/administrative-timeline.mjs';

const base={assetRef:'SYNTHETIC-PARCEL-01',loggedAt:'2026-11-12T21:00:00-06:00',sourceRef:'TEST:SOURCE'};
const ev=(id,kind,occurredAt,extra={})=>createAcquisitionEvent({...base,eventId:id,kind,occurredAt,...extra});
const intake=ev('intake','CASE_INTAKE','2026-11-06T07:50:29-06:00');
const inquiry=ev('broker','BROKER_INQUIRY','2026-11-06T08:37:00-06:00');
test('first logged intake becomes administrative origin only',()=>{
 const state=summarizeAdministrativeChronology([inquiry,intake],'2026-11-12T20:57:00-06:00');
 assert.equal(state.intakeStartedAt,'2026-11-06T07:50:29-06:00');
 assert.equal(state.externalInquiryStartedAt,'2026-11-06T08:37:00-06:00');
 assert.equal(state.statutoryAdversePossessionStartAt,null);
});
test('records inquiry is neither owner-served notice nor statutory possession',()=>{
 const state=summarizeAdministrativeChronology([intake,inquiry],'2026-11-12T21:00:00-06:00');
 assert.equal(state.ownerDirectedNoticeWithDeliveryEvidenceAt,null);
 assert.equal(state.statutoryAdversePossessionStartAt,null);
 assert.equal(state.ownerConsentFromNonresponse,false);
 assert.equal(state.propertyEntryAuthorized,false);
});
test('owner-directed correspondence with proof can be logged without default or property effect',()=>{
 const owner=ev('owner','OWNER_DIRECTED_CORRESPONDENCE','2026-11-08T15:00:00-06:00',{addressee:'Synthetic owner LLC',deliveredProofRef:'TEST:POSTAL-RECEIPT'});
 const state=summarizeAdministrativeChronology([intake,owner],'2026-11-12T21:00:00-06:00');
 assert.equal(state.ownerDirectedNoticeWithDeliveryEvidenceAt,owner.occurredAt);
 assert.equal(state.ownerNoticeServiceLegallyEffective,'UNDETERMINED');
 assert.equal(state.titleTransferred,false);
});
test('backdated recording log does not start legal clock even with field claim',()=>{
 const possession=ev('possession','PHYSICAL_POSSESSION_EVIDENCE','2026-11-06T10:00:00-06:00',{actualPossessionVerified:true,legalReviewRef:'TEST:COUNSEL'});
 const state=summarizeAdministrativeChronology([intake,possession],'2026-11-12T21:00:00-06:00');
 assert.equal(state.potentialActualPossessionEvidenceAt,possession.occurredAt);
 assert.equal(state.statutoryAdversePossessionStartAt,null);
 assert.equal(state.managementAuthorityEstablished,false);
});
test('missing source, invalid dates, and invalid possession flags are rejected',()=>{
 assert.throws(()=>ev('bad','UNKNOWN','2026-11-06T07:50:29-06:00'),/kind/);
 assert.throws(()=>ev('bad','CASE_INTAKE','2026-11-06T07:50:29'),/offset-aware/);
 assert.throws(()=>ev('bad','CASE_INTAKE','2026-11-06T07:50:29-06:00',{actualPossessionVerified:true}),/possession flag/);
});
test('duplicate event IDs rejected regardless of chronological sort',()=>{
 assert.throws(()=>summarizeAdministrativeChronology([intake,intake],'2026-11-12T21:00:00-06:00'),/duplicate/);
});
