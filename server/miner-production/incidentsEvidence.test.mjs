import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveIncident} from './incidents.mjs'
import {verifyBitcoinIncidentResolution} from './bitcoinIncidentEvidence.mjs'
const A='a'.repeat(64)
const incident={id:'INC-1',payoutId:'P-1',state:'OPEN'}
const payout={id:'P-1',txid:A}

test('operator supplied resolution code cannot release payout hold',()=>{
 assert.throws(()=>resolveIncident(incident,{operatorId:'op',resolutionCode:'TX_CONFIRMED'}),/EVIDENCE_BACKED/)
})

test('JSON-forged evidence cannot release payout hold',()=>{
 assert.throws(()=>resolveIncident(incident,{operatorId:'op',resolutionCode:'TX_CONFIRMED',verifiedEvidence:{verified:true,resolutionCode:'TX_CONFIRMED',verifiedAt:new Date().toISOString()}}),/EVIDENCE_BACKED/)
})

test('Bitcoin Core verified evidence can release payout hold',async()=>{
 const rpc=async method=>method==='getrawtransaction'?{txid:A,confirmations:3,blockhash:'block'}:null
 const verifiedEvidence=await verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_CONFIRMED',rpc})
 const resolved=resolveIncident(incident,{operatorId:'op',resolutionCode:'TX_CONFIRMED',verifiedEvidence})
 assert.equal(resolved.state,'RESOLVED');assert.equal(resolved.verifiedEvidence.verified,true)
})
