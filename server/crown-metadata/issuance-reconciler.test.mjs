import test from 'node:test';
import assert from 'node:assert/strict';
import {independentlyReconcileCrownIssuance,validateApprovedIntent,createCrownIssuanceIntentDraft} from './issuance-reconciler.mjs';
import {crownIssuanceDescription} from './issuance-autopublish.mjs';

const asset='NEOTEST';
const source='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk';
const tx='a'.repeat(64),blockHash='b'.repeat(64);
const desc=crownIssuanceDescription(asset);
const intent=()=>({
  schema:'neo.crown.issuance-intent.v1',
  operation:'initial_issuance',network:'bitcoin-mainnet',protocol:'counterparty',
  asset,owner_address:source,issuer_address:source,asset_description_for_signer:desc,
  tx_hash:tx,quantity_raw:'1000',
  metadata:{asset,description:'Illustrative description only. No investment claims.',website:'https://holytemples.org/'},
  approval:{state:'approved_for_metadata_publication',review_reference:'https://github.com/Shemsizedek/neo-system/pull/1233'}
});
function responses(){
  return {
    '/':{result:{server_ready:true,network:'mainnet',ledger_state:'Following',counterparty_height:1009}},
    ['/assets/'+asset]:{result:{asset,issuer:source,owner:source,description:desc,first_issuance_block_index:1000,locked:false}},
    ['/issuances/'+tx]:{result:{tx_hash:tx,asset,source,issuer:source,description:desc,block_index:1000,status:'valid',transfer:false,quantity:1000}},
    '/blocks/last':{result:{block_index:1009,block_hash:'c'.repeat(64)}},
    '/blocks/1000':{result:{block_index:1000,block_hash:blockHash}}
  };
}
function mock(states,options={}){
  const calls=[];
  const fetchImpl=async url=>{
    const path=url.replace('https://api.counterparty.io:4000/v2','');
    calls.push(path);
    if(options.badHttpPath===path)return new Response('error',{status:503});
    const data=states[path];
    if(!data)throw Error('unexpected_external_url_'+path);
    return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json','X-COUNTERPARTY-READY':options.notReady?'false':'true'}});
  };
  return {calls,fetchImpl};
}
const run=(i,config,options)=>independentlyReconcileCrownIssuance(i,{fetchImpl:mock(config||responses(),options).fetchImpl,clock:()=>new Date('2026-10-25T17:55:00Z')});
test('confirmed new Counterparty asset with an operator-approved intent yields a read-only metadata candidate',async()=>{
  const {fetchImpl,calls}=mock(responses());
  const result=await independentlyReconcileCrownIssuance(intent(),{fetchImpl,clock:()=>new Date('2026-10-25T17:55:00Z')});
  assert.equal(result.asset,asset);
  assert.equal(result.canonical_url,desc);
  assert.equal(result.stage,'CONFIRMED_READY_FOR_HOSTING');
  assert.equal(result.publication_status,'VERIFIED_READY_FOR_DEPLOY');
  assert.equal(result.metadata.asset,asset);
  assert.equal(result.provenance.confirmations,10);
  assert.equal(result.provenance.block_hash,blockHash);
  assert.equal(result.onchain_broadcast,false);
  assert.equal(result.provenance.issuer_wallet_signature_verified_by_crown,false);
  assert.equal(result.provenance.external_indexer_ingestion_verified,false);
  assert.deepEqual(calls,['/','/assets/'+asset,'/issuances/'+tx,'/blocks/last','/blocks/1000']);
});
test('unreviewed intent, malformed token name or invalid signer description never contacts Counterparty',async()=>{
  const bad=[
    {...intent(),approval:{state:'not_approved',review_reference:intent().approval.review_reference}},
    {...intent(),approval:{state:'approved_for_metadata_publication',review_reference:'https://attacker.example/ok'}},
    {...intent(),asset:'../../NEOTEST'},
    {...intent(),asset_description_for_signer:'https://example.org/fake.json'},
    {...intent(),quantity_raw:'0'},
    {...intent(),quantity_raw:'999.5'},
    {...intent(),tx_hash:'bad'},
    {...intent(),owner_address:'other'},
    {...intent(),network:'bitcoin-testnet'}
  ];
  for(const candidate of bad)assert.throws(()=>validateApprovedIntent(candidate),String(candidate.asset));
});
test('insufficient confirmations and stale backend fail closed',async()=>{
  let data=responses();data['/blocks/last'].result.block_index=1004;
  await assert.rejects(run(intent(),data),/insufficient_confirmations/);
  data=responses();data['/'].result.ledger_state='Catching Up';
  await assert.rejects(run(intent(),data),/counterparty_not_following_mainnet/);
  data=responses();data['/'].result.network='testnet';
  await assert.rejects(run(intent(),data),/counterparty_not_following_mainnet/);
});
test('asset control, current description, first issuance block and lock status must match',async()=>{
  for(const change of [
    {owner:'1UnexpectedOwner99999999999999999999999'},
    {issuer:'1UnexpectedIssuer999999999999999999999'},
    {description:'https://wrong.example/bad.json'},
    {first_issuance_block_index:999},
    {locked:'unknown'}
  ]){
    const data=responses();Object.assign(data['/assets/'+asset].result,change);
    await assert.rejects(run(intent(),data));
  }
});
test('wrong transaction hash, source, issuer, quantity, status and event class must not publish',async()=>{
  for(const change of [
    {tx_hash:'c'.repeat(64)},
    {source:'1OtherSource11111111111111111111'},
    {issuer:'1OtherSource11111111111111111111'},
    {quantity:999},
    {status:'invalid'},
    {transfer:true},
    {description:'https://example.org/wrong.json'},
    {block_index:1001}
  ]){
    const data=responses();Object.assign(data['/issuances/'+tx].result,change);
    await assert.rejects(run(intent(),data));
  }
});
test('historical description-change event with no tokens is not a newly minted Crown token',async()=>{
  const data=responses();
  data['/issuances/'+tx].result.quantity=0;
  data['/issuances/'+tx].result.asset_events='change_description';
  await assert.rejects(run(intent(),data),/issuance_quantity_mismatch/);
});
test('malformed chain block, unavailable endpoint and API readiness failure fail closed',async()=>{
  let data=responses();data['/blocks/1000'].result.block_hash='not a valid bitcoin hash';
  await assert.rejects(run(intent(),data),/unverified_issuance_block/);
  const down=mock(responses(),{badHttpPath:'/issuances/'+tx});
  await assert.rejects(independentlyReconcileCrownIssuance(intent(),{fetchImpl:down.fetchImpl}),/counterparty_http_or_mime_unavailable/);
  const stale=mock(responses(),{notReady:true});
  await assert.rejects(independentlyReconcileCrownIssuance(intent(),{fetchImpl:stale.fetchImpl}),/counterparty_sync_not_ready/);
});
test('reject unsafe numeric quantity and unreasonable confirmation thresholds',async()=>{
  const data=responses();
  data['/issuances/'+tx].result.quantity=Number.MAX_SAFE_INTEGER+5;
  await assert.rejects(run(intent(),data),/unsafe_numeric_quantity/);
  await assert.rejects(independentlyReconcileCrownIssuance(intent(),{minConfirmations:1}),/invalid_confirmation_threshold/);
});

test('new signer intent draft preserves quantity and metadata but is not approved, signed or broadcast',()=>{
  const draft=createCrownIssuanceIntentDraft({
    asset,ownerAddress:source,quantityRaw:'1000',description:'Original artwork only.',website:'https://holytemples.org/'
  });
  assert.equal(draft.asset_description_for_signer,desc);
  assert.equal(draft.quantity_raw,'1000');
  assert.equal(draft.approval.state,'DRAFT_REQUIRES_OPERATOR_REVIEW');
  assert.equal(draft.tx_hash,null);
  assert.equal(draft.signing_performed,false);
  assert.equal(draft.broadcast_performed,false);
  assert.throws(()=>validateApprovedIntent(draft),/operator_review_required/);
  assert.throws(()=>createCrownIssuanceIntentDraft({asset,ownerAddress:source,quantityRaw:'0',description:'Test'}),/positive_initial_issuance_required/);
});
