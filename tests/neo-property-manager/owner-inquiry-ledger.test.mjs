import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePropertyInquiry,stageInquiryInCrown,reconcileDispatch,reviewOfficialDistressLead}
 from '../../server/neo-property-manager/owner-inquiry-ledger.mjs';
import {verifyChain} from '../../server/neo-property-manager/evidence-envelope.mjs';
const base={
  caseId:'ALG-2502',assetRef:'ALG-2502',address:'2502 Algerian Way, Houston, TX 77098',
  listedOwner:'2502 Algerian Way LLC',ownerRecordSource:'HCAD 0772210030001',
  preparedAt:'2026-11-12T22:00:00-06:00'
};
test('generates a complete parcel-specific informational inquiry with no implicit adverse possession claim',()=>{
 const p=preparePropertyInquiry(base);
 assert.match(p.content,/2502 Algerian Way/);
 assert.match(p.content,/2502 Algerian Way LLC/);
 assert.match(p.content,/not an offer, demand to vacate/);
 assert.match(p.content,/not interpret nonresponse as agreement/);
 assert.equal(p.status,'DRAFT_UNSENT');
 assert.equal(p.propertyEntryAllowed,false);
 assert.equal(p.consentBySilence,false);
 assert.equal(p.actualPossessionVerified,false);
});
test('separate adjacent parcel receives distinct private source event',()=>{
 const a=preparePropertyInquiry(base);
 const b=preparePropertyInquiry({...base,caseId:'ALG-2504',assetRef:'ALG-2504',address:'2504 Algerian Way, Houston, TX 77098',ownerRecordSource:'HCAD 0772210020011'});
 assert.notEqual(a.contentSha256,b.contentSha256);
 let ledger=stageInquiryInCrown([],a);
 ledger=stageInquiryInCrown(ledger,b);
 assert.equal(verifyChain(ledger),true);
 assert.equal(ledger.length,2);
 assert.equal(ledger[0].event.legalEffect,'ASSERTED_ONLY');
 assert.equal(ledger[1].event.access,'RESTRICTED');
});
test('email does not become court service or property possession when sent',()=>{
 const p=preparePropertyInquiry(base);
 const r=reconcileDispatch(p,{recipientIdentityVerified:true,
  recordedSentAt:'2026-11-13T08:10:00-06:00',deliveryProofRef:'TEST:MAIL-RECEIPT'});
 assert.equal(r.communicationStatus,'SENT_REPORTED_NEEDS_PROVENANCE');
 assert.equal(r.legallyEffectiveService,'NOT_DETERMINED');
 assert.equal(r.possessionClockStarted,false);
 assert.equal(r.ownershipConsent,false);
});
test('cannot claim receipt for an unsent packet',()=>{
 const p=preparePropertyInquiry(base);
 assert.throws(()=>reconcileDispatch(p,{replyProofRef:'TEST:REPLY'}),/unsent/);
 assert.equal(reconcileDispatch(p).communicationStatus,'DRAFT_UNSENT');
});
test('official record label does not establish abandonment of title',()=>{
 const r=reviewOfficialDistressLead({caseId:'ALG-2502',recordType:'CITY_CODE_INSPECTION',
  recordRef:'TEST:CODE-DOCUMENT',contentDigest:'dd'.repeat(32),custodianIndependentlyChecked:true});
 assert.equal(r.sourceIdentityReviewed,true);
 assert.equal(r.actualDistressFindingEstablished,false);
 assert.equal(r.abandonmentOfTitle,false);
});
test('invalid dates, record types and missing owner data fail closed',()=>{
 assert.throws(()=>preparePropertyInquiry({...base,listedOwner:''}),/listedOwner required/);
 assert.throws(()=>preparePropertyInquiry({...base,preparedAt:'2026-11-12T22:00:00'}),/offset-aware/);
 assert.throws(()=>reviewOfficialDistressLead({caseId:'ALG-2502',recordType:'SELF_GRANT',recordRef:'x',contentDigest:'dd'.repeat(32)}),/unknown/);
});
