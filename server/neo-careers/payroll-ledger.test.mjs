import test from 'node:test'
import assert from 'node:assert/strict'
import {createPayrollReviewLedger} from './payroll-ledger.mjs'
const proposal={id:'PAY-1',taskId:'TASK-1',workerId:'worker1',employerId:'employer1',asset:'NOMNI',units:'12.5',fiatReference:'USD 25.00 contracted value',jurisdiction:'US-NY'}
test('proposed payroll has no signing or transfer',()=>{const x=createPayrollReviewLedger().propose(proposal);assert.equal(x.transferEnabled,false);assert.equal(x.fundingStatus,'unverified')})
test('duplicate proposal rejected',()=>{const l=createPayrollReviewLedger();l.propose(proposal);assert.throws(()=>l.propose(proposal),/duplicate/)})
test('unknown jurisdiction rejected',()=>assert.throws(()=>createPayrollReviewLedger().propose({...proposal,jurisdiction:'unspecified'})))
test('cannot self-certify token issuance',()=>assert.throws(()=>createPayrollReviewLedger().propose({...proposal,assetVerified:true})))
test('negative amount rejected',()=>assert.throws(()=>createPayrollReviewLedger().propose({...proposal,units:'-1'})))
test('digest stable for same proposal',()=>assert.equal(createPayrollReviewLedger().propose(proposal).hash,createPayrollReviewLedger().propose(proposal).hash))
test('no live financial capability',()=>assert.equal(createPayrollReviewLedger().capabilities().chainBroadcast,false))
