import test from 'node:test'
import assert from 'node:assert/strict'
import {acknowledgeIncident,resolveIncident,incidentBlocksPayout,incidentContext,incidentSummary,markBitcoinEvidenceVerified} from './incidents.mjs'

const base={id:'INC-1',payoutId:'PAY-1',state:'OPEN',reason:'CHAIN_LOOKUP_AMBIGUOUS',severity:'HIGH',createdAt:'2026-01-01T00:00:00.000Z'}
const verifiedEvidence=()=>markBitcoinEvidenceVerified({verified:true,resolutionCode:'CHAIN_VERIFIED',verifiedAt:'2026-01-01T01:00:00.000Z',source:'bitcoin-core'})

test('open and acknowledged incidents block payout until evidence-backed resolution',()=>{
  assert.equal(incidentBlocksPayout([base],'PAY-1'),true)
  const ack=acknowledgeIncident(base,{operatorId:'op-1',note:'reviewing'})
  assert.equal(ack.state,'ACKNOWLEDGED')
  assert.equal(incidentBlocksPayout([ack],'PAY-1'),true)
  const resolved=resolveIncident(ack,{operatorId:'op-2',resolutionCode:'CHAIN_VERIFIED',verifiedEvidence:verifiedEvidence(),note:'Bitcoin evidence verified; safe to resume signing'})
  assert.equal(resolved.state,'RESOLVED')
  assert.equal(incidentBlocksPayout([resolved],'PAY-1'),false)
})

test('incident actions require operator attribution and verified Bitcoin evidence',()=>{
  assert.throws(()=>acknowledgeIncident(base,{}),/OPERATOR_ID_REQUIRED/)
  assert.throws(()=>resolveIncident(base,{operatorId:'op-1',resolutionCode:'CHAIN_VERIFIED'}),/BITCOIN_EVIDENCE_BACKED_RESOLUTION_REQUIRED/)
  assert.throws(()=>resolveIncident(base,{operatorId:'op-1',resolutionCode:'WRONG_CODE',verifiedEvidence:verifiedEvidence()}),/BITCOIN_EVIDENCE_RESOLUTION_MISMATCH/)
})

test('context sanitizes psbt records and exposes blocking state',()=>{
  const ctx=incidentContext({incident:base,payout:{id:'PAY-1',state:'APPROVED',amountBtc:0.1,txid:null},psbts:[{payoutId:'PAY-1',psbtId:'PSBT-1',psbt:'secret-blob',feeBtc:0.0001,signingMode:'EXTERNAL_SIGNER'}],finalizedTransactions:[{payoutId:'PAY-1',psbtId:'PSBT-1',hex:'rawtx',complete:true}]})
  assert.equal(ctx.blocked,true)
  assert.equal('psbt' in ctx.psbts[0],false)
  assert.equal('hex' in ctx.finalizedTransactions[0],false)
})

test('summary counts blocking incidents',()=>{
  const ack={...base,id:'INC-2',state:'ACKNOWLEDGED'}
  const resolved={...base,id:'INC-3',state:'RESOLVED'}
  assert.deepEqual(incidentSummary([base,ack,resolved]),{total:3,open:1,acknowledged:1,resolved:1,blocking:2})
})
