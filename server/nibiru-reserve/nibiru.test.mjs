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
 assert.equal(msg.standard,'ISO 20022');assert.equal(msg.messageDefinition,'pain.001');assert.equal(msg.digitalAssetContext.network,'BITCOIN');
 assert.equal(msg.validation.isoSchemaValidated,false);assert.equal(msg.compliance.travelRuleStatus,'NOT_CHECKED');
});

test('rejects malformed monetary input',()=>assert.throws(()=>service().createIsoPaymentEnvelope({})));
