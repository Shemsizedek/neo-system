import test from 'node:test';
import assert from 'node:assert/strict';
import {createReserveLedger} from './ledger.mjs';
import {createSettlementReconciler} from './reconciliation.mjs';

test('confirms only at threshold and posts one idempotent memorandum journal',()=>{const ledger=createReserveLedger();const r=createSettlementReconciler({ledger,minimumConfirmations:6});const s=r.observe({network:'bitcoin',txHash:'tx1',asset:'NOMNI',quantity:5,blockHash:'b1',blockHeight:100,confirmations:1});assert.equal(r.reconcile(s.id,{txHash:'tx1',blockHash:'b1',confirmations:5}).status,'PENDING_CONFIRMATIONS');assert.equal(r.reconcile(s.id,{txHash:'tx1',blockHash:'b1',confirmations:6}).status,'CONFIRMED');r.reconcile(s.id,{txHash:'tx1',blockHash:'b1',confirmations:7});assert.equal(ledger.journals.size,1)});
test('reorg demotes confirmation and posts balanced reversal',()=>{const ledger=createReserveLedger();const r=createSettlementReconciler({ledger,minimumConfirmations:1});const s=r.observe({network:'bitcoin',txHash:'tx2',asset:'XCP',quantity:2,blockHash:'old',blockHeight:100});r.reconcile(s.id,{txHash:'tx2',blockHash:'old',confirmations:2});const changed=r.reconcile(s.id,{txHash:'tx2',blockHash:'new',confirmations:0,canonical:false});assert.equal(changed.status,'REORGED');assert.ok(changed.reversalJournalId);assert.equal(ledger.trialBalance().balanced,true)});
