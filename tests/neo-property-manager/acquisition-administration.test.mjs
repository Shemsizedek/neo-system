import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAdministrativeSource,classifyDistress,qualifyAcquisition,INTEGRATIONS,ROUTES}
  from '../../server/neo-property-manager/acquisition-administration.mjs';

const sample={documentId:'SOURCE-001',type:'NONRESPONSE_LOG',sourceRef:'synthetic:notice',
  sha256:'aa'.repeat(32)};
test('silence, delivery, notarization and Bitcoin publication never self-convey title',()=>{
  const rec=classifyAdministrativeSource({...sample,nonresponseObserved:true,
    recipientVerified:true,deliveryEvidenceId:'synthetic:delivery',
    publicationTxid:'bb'.repeat(32),contentsAuthenticated:true});
  assert.equal(rec.silenceObserved,true);
  assert.equal(rec.deliveredToNamedRecipient,true);
  assert.equal(rec.publicationEvidence,true);
  assert.equal(rec.titleTransferred,false);
  assert.equal(rec.consentEstablished,false);
  assert.equal(rec.legalServiceEstablished,false);
});
test('private vacancy and utility notice are not official abandonment',()=>{
  const r=classifyDistress({privateVacancyObservation:true,utilityNotice:true});
  assert.equal(r.classification,'UNVERIFIED_DISTRESS_LEAD');
  assert.equal(r.ownerAbandonedTitle,false);
  assert.equal(r.rightToEnter,false);
});
test('official code and tax distress are leads, not title or entry',()=>{
  const r=classifyDistress({publicCodeRecordVerified:true,propertyTaxDelinquencyVerified:true});
  assert.equal(r.classification,'OFFICIAL_DISTRESS_REVIEW');
  assert.equal(r.adversePossessionEstablished,false);
});
test('a complete adverse possession evidence file still requires external legal determination',()=>{
  const r=qualifyAcquisition({route:'ADVERSE_POSSESSION_FACT_REVIEW',
    parcelIdentityVerified:true,ownerOrAdversePartyIdentified:true,
    possessionEvidenceAuthenticated:true,periodAndContinuityEvidenceAuthenticated:true,
    qualifiedCounselReviewed:true});
  assert.equal(r.nextState,'HUMAN_REVIEW_READY');
  assert.equal(r.titleConfirmed,false);
  assert.equal(r.entryAuthorized,false);
  assert.equal(r.canFileOwnershipNotice,false);
});
test('property management requires manager authority and licensing screen',()=>{
  const r=qualifyAcquisition({route:'PROPERTY_MANAGEMENT_MANDATE',
    parcelIdentityVerified:true,ownerOrAdversePartyIdentified:true});
  assert.equal(r.managementActive,false);
  assert.equal(r.nextState,'EVIDENCE_COLLECTION');
  assert.ok(r.missingEvidence.includes('SIGNED_MANAGEMENT_AUTHORITY'));
  assert.ok(r.missingEvidence.includes('LICENSE_SCOPE_REVIEW'));
});
test('service integrations and non-consensual offer routes represented',()=>{
  for(const k of ['NEO Pads','NEO Realty','Smart Realty','NEO Deal Desk',
                   'NEO Crown Chain','Government API']) assert.ok(INTEGRATIONS[k]);
  for(const route of ['UNSOLICITED_PURCHASE','DISTRESSED_DEBT_PURCHASE',
                       'ADVERSE_POSSESSION_FACT_REVIEW']) assert.ok(ROUTES.includes(route));
});
