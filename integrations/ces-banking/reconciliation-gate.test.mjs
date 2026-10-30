import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertSafeCesReportRequest, validateSanitizedObservation, createReadOnlyEvidencePacket,assessCesBankingActivation} from './reconciliation-gate.mjs';
const now='2026-10-29T22:00:00Z';
const c={reference:'ref_ces_20261029',kind:'CES_MUTUAL_CREDIT',source:'ces',exchange:'NMNI',unit:'NMNI',amount:'100.00',direction:'credit',asOf:now,status:'reported-unverified'};
const v={...c,reference:'ref_vdol_20261029',kind:'CES_V_DOLLAR',unit:'VDOLLAR',amount:'25.50'};
const b={reference:'ref_bank_20261029',kind:'BANK_FIAT_OBSERVATION',source:'modern-treasury',unit:'USD',amount:'50.00',direction:'credit',asOf:now,status:'reported-unverified',rail:'wire'};
const x={reference:'ref_chain_20261029',kind:'COUNTERPARTY_NOMNI',source:'bitcoin-counterparty',unit:'NOMNI',amount:'900000000',direction:'credit',asOf:now,status:'observed-unverified'};
test('CES admin URL fails closed on embedded credentials, outbound routes and mutations',()=>{
 const approved=assertSafeCesReportRequest('https://www.community-exchange.org/_admin/reptrades.asp');
 assert.equal(approved.bodyAllowed,false);
 for(const url of [
 'https://www.community-exchange.org/rlogin.asp?uid=admin&pw=example',
 'https://www.community-exchange.org/_admin/reptrades.asp?x=1',
 'https://www.community-exchange.org/_admin/tx.asp',
 'https://www.community-exchange.org/_admin/reptrades.asp#fragment',
 'https://not-ces.example/_admin/reptrades.asp',
 'https://user:password@www.community-exchange.org/_admin/reptrades.asp',
 ])assert.throws(()=>assertSafeCesReportRequest(url));
 assert.throws(()=>assertSafeCesReportRequest('https://www.community-exchange.org/_admin/reptrades.asp',{method:'POST'}));
});
test('sanitized source records keep ledger types, exact amounts and provenance separate',()=>{
 const result=createReadOnlyEvidencePacket({observations:[c,v,b,x]});
 assert.equal(result.counts.ces,2);
 assert.equal(result.counts.bank,1);
 assert.equal(result.counts.blockchain,1);
 assert.equal(result.crossLedgerSettlementVerified,false);
 assert.equal(result.fedwireBankRelationshipVerified,false);
 assert.equal(result.valueMovementAuthorized,false);
 assert.equal(result.bySeparateLedgerUnit['modern-treasury:none:BANK_FIAT_OBSERVATION:USD:credit'],'5000');
 assert.equal(result.bySeparateLedgerUnit['ces:NMNI:CES_V_DOLLAR:VDOLLAR:credit'],'2550000000');
});
test('disallow PII, account metadata, ETH/Base and fabricated bank reserve attestation',()=>{
 for(const changed of [
  {...c,accountNumber:'12345'},
  {...c,loginUrl:'https://example.test/?pw=example'},
  {...c,unit:'USD'},
  {...c,status:'verified'},
  {...b,kind:'CES_V_DOLLAR'},
  {...b,unit:'USDC'},
  {...x,source:'base'},
  {...x,unit:'ETH'},
  {...b,amount:'1.001'},
  {...c,amount:2},
  {...c,amount:'2e20'},
  {...b,rail:'fedwire-direct'},
 ])assert.throws(()=>validateSanitizedObservation(changed));
 assert.throws(()=>createReadOnlyEvidencePacket({observations:[c,c]}),/Duplicate/);
});
test('simulation activation never converts input claims to money movement or external bank access',()=>{
 const result=assessCesBankingActivation({cesBotAuthVerified:true,readonlySessionVerified:true,
 modernTreasuryReadRoleVerified:true,fedwireBankParticipationVerified:true});
 assert.equal(result.cesBotAuthenticationClaimed,true);
 assert.equal(result.cesReadOnlyReady,false);
 assert.equal(result.modernTreasuryReadOnlyReady,false);
 assert.equal(result.fedwireBankParticipationVerified,false);
 assert.equal(result.liveMoneyMovementEnabled,false);
 assert.equal(result.liveFederatedBankingEnabled,false);
 assert.equal(result.needsIndependentCredentialAndBankValidation,true);
});
test('module has no network, secret, external SDK, shell, or file writes',async()=>{
 const src=await readFile(new URL('./reconciliation-gate.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/\b(?:fetch|require|eval|WebSocket)\s*\(|\bimport\s*\(|\bprocess\.env\b|node:(?:http|https|net|tls|child_process)|coinbase|ethers|viem/);
});
