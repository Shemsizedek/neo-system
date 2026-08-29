import test from 'node:test';
import assert from 'node:assert/strict';
import {createNibiruReserve} from './nibiru.mjs';

const service=()=>createNibiruReserve({now:()=> '2026-08-29T00:00:00.000Z'});

test('records CES position without misrepresenting it as dollars or reserves',()=>{
 const n=service();const row=n.recordCesPosition({cesExchangeId:'NIBIRU',cesAccountId:'A-1',unit:'usd',amount:100,externalReference:'CES-1'});
 assert.equal(row.status,'UNVERIFIED');assert.equal(row.legalTenderClaim,false);assert.equal(row.reserveAsset,false);
 const snapshot=n.reserveSnapshot();assert.equal(snapshot.totals.USD,100);assert.equal(snapshot.attestation,'NONE');
});

test('links observed Counterparty settlement without enabling custody',()=>{
 const n=service();const row=n.recordCesPosition({cesExchangeId:'NIBIRU',cesAccountId:'A-1',unit:'NOM',amount:5,externalReference:'CES-2'});
 const linked=n.linkBlockchainSettlement(row.id,{network:'bitcoin',txHash:'abc123',asset:'NOMNI',quantity:'5',confirmations:2});
 assert.equal(linked.status,'LINKED_NOT_RECONCILED');assert.equal(linked.blockchainSettlement.asset,'NOMNI');assert.equal(n.capabilities().custody,false);
});

test('maps a payment into ISO-aligned canonical data without claiming rail validation',()=>{
 const msg=service().createIsoPaymentEnvelope({messageId:'MSG-1',endToEndId:'E2E-1',debtorName:'Alice',debtorAccount:'CES-A',creditorName:'Bob',creditorAccount:'CES-B',amount:25,currency:'USD',purpose:'GDDS',digitalAssetContext:{network:'bitcoin',asset:'NOMNI',address:'1abc',txHash:'tx1'}});
 assert.equal(msg.standard,'ISO 20022');assert.equal(msg.messageDefinition,'pain.001.001.13');assert.equal(msg.digitalAssetContext.network,'BITCOIN');
 assert.equal(msg.validation.isoSchemaValidated,false);assert.equal(msg.compliance.travelRuleStatus,'NOT_CHECKED');
});

test('rejects malformed monetary input',()=>assert.throws(()=>service().createIsoPaymentEnvelope({})));

test('renders escaped version-pinned XML without claiming official validation',()=>{
 const n=service();const msg=n.createIsoPaymentEnvelope({messageId:'MSG-XML',endToEndId:'E2E-XML',debtorName:'A & B',debtorAccount:'CES-A',creditorName:'C < D',creditorAccount:'CES-B',amount:25,currency:'USD',purpose:'GDDS'});
 const rendered=n.renderIsoPayment(msg.id);assert.match(rendered.document,/pain\.001\.001\.13/);assert.match(rendered.document,/A &amp; B/);assert.equal(rendered.structuralValidation.valid,true);assert.equal(rendered.structuralValidation.officialXsdValidated,false);
});

test('runs the configured hash-pinned XSD gate without authorizing transmission',async()=>{
 const schemaBytes=Buffer.from('pinned-test-schema');
 const expectedSha256=(await import('node:crypto')).createHash('sha256').update(schemaBytes).digest('hex');
 const n=createNibiruReserve({now:()=> '2026-08-29T00:00:00.000Z',isoXsd:{schemaBytes,expectedSha256,validator:async()=>({valid:true,errors:[]})}});
 const msg=n.createIsoPaymentEnvelope({messageId:'MSG-XSD',endToEndId:'E2E-XSD',debtorName:'Alice',debtorAccount:'CES-A',creditorName:'Bob',creditorAccount:'CES-B',amount:25,currency:'USD',purpose:'GDDS'});
 const validated=await n.validateIsoPayment(msg.id);
 assert.equal(validated.xsdValidation.officialXsdValidated,true);assert.equal(validated.transmissionAuthorized,false);assert.equal(n.capabilities().iso20022.officialXsdValidation,true);
});

test('syncs the real CES adapter contract into a balanced memorandum journal',async()=>{
 const adapter={status:()=>({schema:'neo.ces.adapter.v1',configured:true,readOnly:true}),getBalance:async()=>({network:'demo',account:'A-1',unit:'CES',amount:12.5,reference:'BAL-1',observedAt:'2026-08-28T00:00:00Z'})};
 const n=createNibiruReserve({now:()=> '2026-08-29T00:00:00.000Z',cesAdapter:adapter});const synced=await n.syncCes({token:'redacted'});
 assert.equal(synced.entry.status,'CES_VERIFIED');assert.equal(synced.journal.debits,12.5);assert.equal(n.ledger.trialBalance().balanced,true);
});
