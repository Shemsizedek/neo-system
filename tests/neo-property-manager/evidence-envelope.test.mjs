import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceEvent, appendEvent, verifyChain, sha256, preparePublicCommitment, verifyCommitment, acquisitionState } from '../../server/neo-property-manager/evidence-envelope.mjs';

const assetRef='SYNTHETIC-ASSET-0001';
function ev(id,sourceClass,sourceRef,legalEffect,linkedEventId=null) {
  return evidenceEvent({assetRef,eventId:id,sourceClass,sourceRef,contentHash:sha256('synthetic:'+id),occurredAt:'2026-11-10T19:00:00Z',legalEffect,access:'RESTRICTED',linkedEventId});
}

test('separate CES entry can exist and be linked without NOMNI transfer',()=>{
  let ledger=[];
  ledger=appendEvent(ledger,ev('e1','OWNER_NOTICE','demo:notice-001','ASSERTED_ONLY'));
  ledger=appendEvent(ledger,ev('e2','SERVICE_PROOF','demo:carrier-confirmation-001','ASSERTED_ONLY','e1'));
  ledger=appendEvent(ledger,ev('e3','CES_JOURNAL','demo:ces-entry-0001','INTERNAL_LEDGER_POSTED','e1'));
  ledger=appendEvent(ledger,ev('e4','BITCOIN_BROADCAST','demo:counterparty-tx-0001','PUBLICATION_OBSERVED','e3'));
  assert.equal(verifyChain(ledger),true);
  assert.equal(ledger.length,4);
  assert.equal(ledger.find(x=>x.event.eventId==='e3').event.sourceClass,'CES_JOURNAL');
  assert.equal(ledger.some(x=>x.event.sourceClass==='COUNTERPARTY_EVENT'),false);
});

test('tampering and duplicate events fail',()=>{
  const ledger=appendEvent([],ev('e1','COUNTY_RECORD','demo:unverified','RECORD_FILED'));
  assert.equal(verifyChain([{...ledger[0],event:{...ledger[0].event,sourceRef:'tampered'}}]),false);
  assert.throws(()=>appendEvent(ledger,ev('e1','COUNTY_RECORD','duplicate','RECORD_FILED')),/duplicate/);
});

test('public commitment does not expose private source references',()=>{
  const ledger=appendEvent([],ev('e1','OWNER_NOTICE','PRIVATE_OWNER_NAME','ASSERTED_ONLY'));
  const {publicReceipt,privateVerification}=preparePublicCommitment(ledger,'ab'.repeat(32));
  assert.equal(verifyCommitment(publicReceipt,privateVerification),true);
  assert.equal(JSON.stringify(publicReceipt).includes('PRIVATE_OWNER_NAME'),false);
  assert.equal(JSON.stringify(publicReceipt).includes('e1'),false);
  assert.equal(publicReceipt.publicationStatus,'NOT_PUBLISHED');
});

test('source records or notice publication alone grant no right of entry',()=>{
  assert.equal(acquisitionState().propertyEntryAuthorized,false);
  assert.equal(acquisitionState().managementOperationsAuthorized,false);
  assert.equal(acquisitionState().issuePropertyBackedInstrument,false);
  assert.equal(acquisitionState({verifiedDeed:true}).propertyEntryAuthorized,false);
  assert.equal(acquisitionState({verifiedDeed:true,authorizedControl:true}).propertyEntryAuthorized,true);
  assert.equal(acquisitionState({verifiedDeed:true,authorizedControl:true,authorizedManagementContract:true}).managementOperationsAuthorized,true);
});

test('invented source classes are rejected',()=>{
  assert.throws(()=>evidenceEvent({assetRef,eventId:'t',sourceClass:'LEGAL_TITLE_GRANTED',sourceRef:'x',contentHash:'bad',occurredAt:'2026-11-10T19:00:00Z',legalEffect:'ASSERTED_ONLY',access:'RESTRICTED'}),/sourceClass/);
});
