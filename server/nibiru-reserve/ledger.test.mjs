import test from 'node:test';
import assert from 'node:assert/strict';
import {createReserveLedger} from './ledger.mjs';

test('posts balanced idempotent journals',()=>{const l=createReserveLedger();const input={reference:'R-1',unit:'USD',lines:[{account:'A',debit:10},{account:'B',credit:10}]};const a=l.postJournal(input),b=l.postJournal(input);assert.equal(a.id,b.id);assert.equal(l.trialBalance().balanced,true)});
test('rejects unbalanced and double-sided lines',()=>{const l=createReserveLedger();assert.throws(()=>l.postJournal({reference:'R',unit:'USD',lines:[{account:'A',debit:10},{account:'B',credit:9}]}),/not balanced/);assert.throws(()=>l.postJournal({reference:'R2',unit:'USD',lines:[{account:'A',debit:10,credit:10},{account:'B',credit:10}]}),/exactly one/) });
