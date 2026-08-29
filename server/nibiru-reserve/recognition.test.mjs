import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecognitionGate} from './recognition.mjs';

test('fails closed without complete fresh evidence and full backing',()=>{const gate=createRecognitionGate();const row=gate.assess({positionId:'P1',unit:'USD',amount:100,backingValue:50});assert.equal(row.status,'BLOCKED');assert.equal(row.recognized,false);assert.ok(row.blockers.includes('insufficient_backing'))});
test('complete evidence reaches human review but is not automatically recognized',()=>{const gate=createRecognitionGate({now:()=> '2026-08-29T00:00:00Z'});const row=gate.assess({positionId:'P2',unit:'USD',amount:100,backingValue:100,issuerId:'I',legalObligationRef:'L',redemptionTermsRef:'R',backingAccountRef:'B',custodianRef:'C',attestationRef:'A',attestationAsOf:'2026-08-28T00:00:00Z'});assert.equal(row.status,'ELIGIBLE_FOR_HUMAN_REVIEW');assert.equal(row.recognized,false);const approved=gate.approve(row.id,{approverId:'officer-1',authorityRef:'POLICY-1'});assert.equal(approved.status,'APPROVED_FOR_ACCOUNTING_POLICY');assert.equal(approved.recognized,false)});
