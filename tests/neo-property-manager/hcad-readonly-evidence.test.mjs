import test from 'node:test';
import assert from 'node:assert/strict';
import { PILOT_PARCELS, captureAppraisalRecord, linkHCADToCrown, stagePublicProof,
         acquisitionSignal } from '../../server/neo-property-manager/hcad-readonly-evidence.mjs';
import { verifyChain, verifyCommitment } from '../../server/neo-property-manager/evidence-envelope.mjs';

const pdf=Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(180,0x43)]);
const input={
  account:'0772210030001',sourceBytes:pdf,
  sourceMailboxReference:'SYNTHETIC-HCAD-EMAIL-ID',
  receivedAt:'2026-11-10T16:25:41Z',
  reportedOwner:'SYNTHETIC OWNER LLC',
  reportedOwnerEffectiveDate:'2026-06-24',
  reportedAppraisedValue:2989249
};
test('captures original PDF bytes, metadata, and separately flags unverified title',()=>{
  const result=captureAppraisalRecord(input);
  assert.equal(result.assetRef,'ALG-2502');
  assert.equal(result.sourceHash.length,64);
  assert.equal(result.originalByteCount,pdf.length);
  assert.equal(result.titleConclusion,'NOT_VERIFIED');
  assert.equal(result.signedCustodianAuthentication,'NOT_VERIFIED');
  assert.equal(result.entryAuthorized,false);
});
test('both Algerian pilot accounts are recognized without expanding authority',()=>{
  assert.equal(Object.keys(PILOT_PARCELS).length,2);
  const rec=captureAppraisalRecord({...input,account:'0772210020011',reportedAppraisedValue:602258});
  const signal=acquisitionSignal(rec);
  assert.equal(signal.assetRef,'ALG-2504');
  assert.equal(signal.eligibleAction,'NONBINDING_COUNTERPARTY_RESEARCH');
  assert.equal(signal.certifiedDeedVerified,false);
  assert.equal(signal.cityDistressFindingVerified,false);
});
test('links HCAD receipt to Crown evidence chain in read-only memory',()=>{
  const rec=captureAppraisalRecord(input);
  const ledger=linkHCADToCrown({receipt:rec,eventId:'SYNTHETIC-RECEIPT-1'});
  assert.equal(verifyChain(ledger),true);
  assert.equal(ledger.length,1);
  assert.equal(ledger[0].event.contentHash,rec.sourceHash);
  assert.equal(ledger[0].event.legalEffect,'ASSERTED_ONLY');
  assert.equal(ledger[0].event.access,'RESTRICTED');
});
test('privacy commitment carries no owner, account or property metadata',()=>{
  const receipt=captureAppraisalRecord(input);
  const ledger=linkHCADToCrown({receipt,eventId:'SYNTHETIC-RECEIPT-2'});
  const proof=stagePublicProof(ledger);
  assert.equal(verifyCommitment(proof.publicReceipt,proof.privateVerification),true);
  assert.deepEqual(Object.keys(proof.publicReceipt).sort(),
    ['schema','commitment','evidenceCount','publicationStatus'].sort());
  assert.equal(Object.hasOwn(proof.publicReceipt,'reportedOwner'),false);
  assert.equal(Object.hasOwn(proof.publicReceipt,'account'),false);
  assert.equal(proof.publicReceipt.publicationStatus,'NOT_PUBLISHED');
});
test('rejects malformed PDFs, unknown accounts and invalid fields',()=>{
  assert.throws(()=>captureAppraisalRecord({...input,account:'0000000000000'}),/not a pilot/);
  assert.throws(()=>captureAppraisalRecord({...input,sourceBytes:Buffer.from('wrong')}),/original PDF/);
  assert.throws(()=>captureAppraisalRecord({...input,reportedAppraisedValue:-1}),/value/);
});
