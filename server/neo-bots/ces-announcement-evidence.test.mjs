import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCesAnnouncement,reconcileAnnouncement,CES_EVIDENCE_STATES} from './ces-announcement-evidence.mjs';

test('book entry requires voucher and CES transaction ID',()=>{
 const r=parseCesAnnouncement({id:'a1',text:'Book Entry: Credit Voucher: CV-144 CES Transaction ID: TX-999 SELLER: WORLD CREDIT UNION – NMNI0260 BUYER: GLOBAL CES ACCOUNT AMOUNT: ∞'});
 assert.equal(r.route,'book-entry'); assert.equal(r.notationValid,true); assert.equal(r.state,CES_EVIDENCE_STATES.NOTATION_VERIFIED); assert.equal(r.cesTransactionId,'TX-999');
});

test('check deposit accepts trade slip or check number',()=>{
 const r=parseCesAnnouncement({text:'Check Deposit: Trade Slip: TS-77 SELLER: WORLD CREDIT UNION – NMNI0260'});
 assert.equal(r.notationValid,true); assert.equal(r.tradeSlip,'TS-77');
});

test('malformed notation is rejected',()=>{
 const r=parseCesAnnouncement({text:'Book Entry: announcement without primary notation identifiers'});
 assert.equal(r.state,CES_EVIDENCE_STATES.REJECTED);
});

test('ledger match promotes only to TV-2 without supporting evidence',()=>{
 const r=parseCesAnnouncement({text:'Book Entry: Credit Voucher: CV-1 CES Transaction ID: TX-1'});
 const x=reconcileAnnouncement(r,{ledgerTransactions:[{transactionId:'TX-1'}]});
 assert.equal(x.state,CES_EVIDENCE_STATES.LEDGER_MATCHED);
});

test('community evidence promotes to TV-3 and external verification is explicit',()=>{
 const r=parseCesAnnouncement({text:'Check Deposit: Check No: EC-44'});
 const x=reconcileAnnouncement(r,{ledgerTransactions:[{checkNumber:'EC-44'}],communityEvidence:[{checkNumber:'EC-44'}]});
 assert.equal(x.state,CES_EVIDENCE_STATES.COMMUNITY_EVIDENCE_VERIFIED);
 const y=reconcileAnnouncement(r,{ledgerTransactions:[{checkNumber:'EC-44'}],externalVerification:true});
 assert.equal(y.state,CES_EVIDENCE_STATES.EXTERNALLY_VERIFIED);
});
