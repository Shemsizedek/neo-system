import test from 'node:test'
import assert from 'node:assert/strict'
import {registerVenue,normalizeBook,createRfq,evaluateVenueHealth,scoreRoute,chooseBestRoute,createExecutionIntent,reconcileExecution,routerSnapshot} from './fabric.mjs'

test('healthy venue requires authorization adapter and fresh heartbeat',()=>{const v=registerVenue({venue_id:'xcp',venue_type:'XCP_DEX',authorized:true,execution_adapter:'counterparty-v2',health:'HEALTHY',last_seen_at:new Date().toISOString()});assert.equal(evaluateVenueHealth(v).healthy,true)})
test('self trade only liquidity is rejected',()=>{const v=registerVenue({venue_id:'x',venue_type:'XCP_DEX',authorized:true,execution_adapter:'a',health:'HEALTHY',last_seen_at:new Date().toISOString()}),b=normalizeBook({venue_id:'x',base_asset:'NOMNI',quote_asset:'XCP',asks:[{price:2,quantity:5,owner_id:'me'}]});assert.equal(scoreRoute({venue:v,book:b,side:'BUY',quantity:1,requester_id:'me'}).reason,'self_trade_only_liquidity')})
test('router chooses eligible best venue',()=>{const ts=new Date().toISOString(),venues=[registerVenue({venue_id:'a',venue_type:'XCP_DEX',authorized:true,execution_adapter:'a',health:'HEALTHY',last_seen_at:ts,latency_ms:100}),registerVenue({venue_id:'b',venue_type:'EXTERNAL_ADAPTER',authorized:true,execution_adapter:'b',health:'HEALTHY',last_seen_at:ts,latency_ms:100})],books=[normalizeBook({venue_id:'a',base_asset:'NOMNI',quote_asset:'XCP',asks:[[2,10]]}),normalizeBook({venue_id:'b',base_asset:'NOMNI',quote_asset:'XCP',asks:[[1.9,10]]})],r=chooseBestRoute({venues,books,request:{base_asset:'NOMNI',quote_asset:'XCP',side:'BUY',quantity:1,reference_price:2,max_slippage_bps:1000}});assert.equal(r.selected.venue_id,'b')})
test('execution reconciliation needs evidence and prohibits self-trade',()=>{const route={selected:{eligible:true,venue_id:'x',execution_price:2,execution_type:'ORDER_BOOK'}},req={base_asset:'NOMNI',quote_asset:'XCP',side:'BUY',quantity:1};const i=createExecutionIntent({route,request:req});assert.throws(()=>reconcileExecution(i,{venue_trade_id:'t',actual_price:2,filled_quantity:1,settlement_evidence_ref:'s',self_trade:true}),/self_trade_prohibited/);assert.equal(reconcileExecution(i,{venue_trade_id:'t',actual_price:2,filled_quantity:1,settlement_evidence_ref:'s'}).state,'RECONCILED')})
test('snapshot exposes market-integrity posture',()=>{const s=routerSnapshot({});assert.equal(s.protections.self_trade_prevention,true);assert.equal(s.protections.synthetic_liquidity_without_source,false)})

const controlGroups = new Map([['bot-a','neo-operator'],['bot-b','neo-operator'],['external-seller','independent-operator']])
const resolveControlGroup = id => controlGroups.get(id)
const venue = () => registerVenue({venue_id:'x',venue_type:'XCP_DEX',authorized:true,execution_adapter:'synthetic',health:'HEALTHY',last_seen_at:new Date().toISOString()})
const book = asks => normalizeBook({venue_id:'x',base_asset:'TESTASSET',quote_asset:'XCP',asks})

test('common control blocks distinct bots and unknown owners in attributed routing',()=>{
  for(const owner_id of ['bot-a','bot-b','unattributed',null]){
    const result=scoreRoute({venue:venue(),book:book([{price:1,quantity:5,owner_id}]),quantity:1,requester_id:'bot-a',resolveControlGroup})
    assert.equal(result.eligible,false)
  }
  const result=scoreRoute({venue:venue(),book:book([{price:1,quantity:5,owner_id:'external-seller'}]),quantity:1,requester_id:'unknown',resolveControlGroup})
  assert.equal(result.reason,'unverified_requester_control')
})

test('best-route selection excludes cheap same-owner quotes and uses independent liquidity',()=>{
  const result=chooseBestRoute({venues:[venue()],books:[book([{price:1,quantity:10,owner_id:'bot-b'},{price:2,quantity:10,owner_id:'external-seller'}])],request:{base_asset:'TESTASSET',quote_asset:'XCP',side:'BUY',quantity:2,requester_id:'bot-a'},resolveControlGroup})
  assert.equal(result.selected.execution_price,2)
  assert.equal(result.selected.quantity,2)
  assert.equal(chooseBestRoute({venues:[venue()],books:[book([{price:1,quantity:1,owner_id:'external-seller'},{price:1,quantity:10,owner_id:'bot-b'}])],request:{base_asset:'TESTASSET',quote_asset:'XCP',side:'BUY',quantity:2,requester_id:'bot-a'},resolveControlGroup}).selected,null)
})

test('common-control prevention applies to RFQ counterparty and owner, with independent fallback',()=>{
  const rfq=counterparty_id=>createRfq({rfq_id:'r',venue_id:'x',base_asset:'TESTASSET',quote_asset:'XCP',quantity:5,price:3,executable:true,counterparty_id})
  for(const id of ['bot-b','unknown',null])assert.equal(scoreRoute({venue:venue(),rfq:rfq(id),quantity:1,requester_id:'bot-a',resolveControlGroup}).eligible,false)
  assert.equal(scoreRoute({venue:venue(),rfq:{...rfq('external-seller'),owner_id:'bot-b'},quantity:1,requester_id:'bot-a',resolveControlGroup}).eligible,false)
  const result=scoreRoute({venue:venue(),book:book([{price:1,quantity:5,owner_id:'bot-b'}]),rfq:rfq('external-seller'),quantity:1,requester_id:'bot-a',resolveControlGroup})
  assert.equal(result.eligible,true)
  assert.equal(result.execution_type,'RFQ')
})
