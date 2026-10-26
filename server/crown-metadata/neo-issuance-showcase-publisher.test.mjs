import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {observeApprovedCrownCreation} from './neo-issuance-event-observer.mjs';
import {stageConfirmedNeoShowcase} from './neo-issuance-showcase-publisher.mjs';
import {stageApprovedMetadata} from './issuance-publication.mjs';
import {canonicalJson} from './investment-card-engine.mjs';
import {crownIssuanceDescription} from './issuance-autopublish.mjs';

const asset='NEOBOND',wallet='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk';
const tx='a'.repeat(64),blockHash='b'.repeat(64);
const canonical=crownIssuanceDescription(asset);
const api='https://api.counterparty.io:4000/v2';

function approved(overrides={}){
  const base={
    schema:'neo.crown.issuance-intent.v1',
    operation:'initial_issuance',network:'bitcoin-mainnet',protocol:'counterparty',
    asset,owner_address:wallet,issuer_address:wallet,quantity_raw:'1000',tx_hash:null,
    asset_description_for_signer:canonical,
    metadata:{asset,description:'An issuer-proposed NEO bond. No verified legal terms.',website:'https://holytemples.org/'},
    approval:{state:'approved_for_metadata_publication',review_reference:'https://github.com/Shemsizedek/neo-system/pull/1236'},
    showcase:{instrument_type:'bond',style:'aurum',public_title:'NEO Bond Showcase'}
  };
  return {...base,...overrides};
}
const creation=()=>({
  asset,asset_events:'creation',tx_hash:tx,block_index:1000,source:wallet,issuer:wallet,
  quantity:1000,description:canonical,status:'valid',transfer:false
});
const descriptionChange=()=>({
  ...creation(),asset_events:'change_description',tx_hash:'c'.repeat(64),quantity:0,block_index:1006
});
function payloads(){
  return {
    ['/assets/'+asset+'/issuances?limit=100']:{result:[descriptionChange(),creation()],next_cursor:null,result_count:2},
    '/':{result:{server_ready:true,network:'mainnet',ledger_state:'Following',counterparty_height:1012}},
    ['/assets/'+asset]:{result:{
      asset,asset_longname:null,issuer:wallet,owner:wallet,description:canonical,
      supply:1000,divisible:false,locked:true,first_issuance_block_index:1000
    }},
    ['/issuances/'+tx]:{result:creation()},
    '/blocks/last':{result:{block_index:1012,block_hash:'d'.repeat(64)}},
    '/blocks/1000':{result:{block_index:1000,block_hash:blockHash}}
  };
}
function stub({routes=payloads(),canonicalStatus=200,disableCanonical=false}={}){
  const calls=[];
  const fetchImpl=async (url,options={})=>{
    calls.push({url,options});
    if(url===canonical){
      if(disableCanonical)throw Error('canonical_unavailable');
      return new Response(JSON.stringify(approved().metadata),{
        status:canonicalStatus,headers:{'content-type':'application/json'}
      });
    }
    if(!url.startsWith(api))throw Error('unapproved_external_host');
    const path=url.slice(api.length);
    const object=routes[path];
    if(object===undefined)throw Error('unexpected_off_chain_route_'+path);
    if(object==='offline')return new Response('Unavailable',{status:503});
    return new Response(JSON.stringify(object),{
      status:200,headers:{'content-type':'application/json','X-COUNTERPARTY-READY':'true'}
    });
  };
  return {fetchImpl,calls};
}
async function temp(t){
  const root=await mkdtemp(join(tmpdir(),'neo-ncc017-'));
  t.after(()=>rm(root,{force:true,recursive:true}));
  return root;
}
const clock=()=>new Date('2026-10-25T23:55:00.000Z');
const filesFor=(root,a=asset)=>join(root,'apps/neoscan/web/cardmaster/assets',a);

test('automatically discovers exactly one approved first issuance from official creation event',async()=>{
  const network=stub();
  const result=await observeApprovedCrownCreation(approved(),{fetchImpl:network.fetchImpl});
  assert.equal(result.status,'creation_observed_unconfirmed');
  assert.equal(result.observation.event_type,'creation');
  assert.equal(result.observation.quantity_raw,'1000');
  assert.equal(result.observation.tx_hash,tx);
  assert.equal(result.intent_with_observed_tx.tx_hash,tx);
  assert.equal(result.observation.wallet_control_verified_by_neo,false);
  assert.equal(result.observation.confirmations_verified,false);
  assert.deepEqual(network.calls.map(x=>x.url),[api+'/assets/'+asset+'/issuances?limit=100']);
  assert.equal(network.calls[0].options.redirect,'error');
});

test('approved planned but not yet issued asset stays pending and writes no false showcase',async t=>{
  const root=await temp(t);
  const state=payloads();
  state['/assets/'+asset+'/issuances?limit=100']={result:[],next_cursor:null,result_count:0};
  const network=stub({routes:state});
  const outcome=await stageConfirmedNeoShowcase(approved(),{root,fetchImpl:network.fetchImpl,clock});
  assert.equal(outcome.stage,'AWAITING_AUTHORIZED_CREATION_EVENT');
  assert.equal(outcome.written,false);
  assert.deepEqual(network.calls.map(x=>x.url),[api+'/assets/'+asset+'/issuances?limit=100']);
  await assert.rejects(readFile(join(filesFor(root),'showcase.json')),{code:'ENOENT'});
});
test('operator-approved new issuance auto-stages an immutable NEO-branded bond JSON and front/back SVG',async t=>{
  const root=await temp(t),intent=approved(),network=stub();
  await stageApprovedMetadata(intent,{root});
  const outcome=await stageConfirmedNeoShowcase(intent,{root,fetchImpl:network.fetchImpl,clock});
  assert.equal(outcome.stage,'CHAIN_CONFIRMED_FILES_STAGED');
  assert.equal(outcome.brand,'NEO');
  assert.equal(outcome.written,true);
  assert.equal(outcome.public_hosting_verified,false);
  assert.equal(outcome.explorer_enrichment_verified,false);
  const base=filesFor(root);
  const saved=JSON.parse(await readFile(join(base,'showcase.json'),'utf8'));
  const manifest=JSON.parse(await readFile(join(base,'showcase-manifest.json'),'utf8'));
  const front=await readFile(join(base,'showcase-front.svg'),'utf8');
  const back=await readFile(join(base,'showcase-back.svg'),'utf8');
  const receipt=JSON.parse(await readFile(join(root,'server/crown-metadata/issuance-receipts',asset+'.json'),'utf8'));
  assert.equal(manifest.brand,'NEO');
  assert.equal(manifest.canonical_metadata_brand,'NEO canonical metadata');
  assert.equal(manifest.asset_code,asset);
  assert.equal(manifest.status,'CHAIN_CONFIRMED_AWAITING_PUBLIC_HOST_READBACK');
  assert.equal(manifest.issuance_transaction,tx);
  assert.equal(manifest.issuance_block,1000);
  assert.equal(saved.payload.asset,asset);
  assert.equal(saved.payload.classification.type,'bond');
  assert.equal(saved.payload.classification.status,'ISSUER_DECLARED');
  assert.equal(saved.payload.classification.legal_classification_verified,false);
  assert.equal(saved.payload.mode,'OBSERVED_COUNTERPARTY_ASSET');
  assert.equal(saved.payload.ledger.supply_raw,'1000');
  assert.equal(saved.payload.ledger.locked,true);
  assert.equal(saved.payload.provenance.issuance_transaction_verified,true);
  assert.equal(saved.payload.provenance.issuer_wallet_control_verified,false);
  assert.equal(saved.payload.provenance.bitcoin_full_node_consensus_verified,false);
  assert.equal(saved.payload.provenance.third_party_explorer_enrichment_verified,false);
  assert.equal(saved.payload.market.price,null);
  assert.equal(saved.payload.issuance.safe_to_issue,false);
  assert.equal(saved.payload.provenance.observation_at,receipt.checked_at);
  assert.equal(saved.integrity.sha256,createHash('sha256').update(canonicalJson(saved.payload)).digest('hex'));
  assert.equal(manifest.hashes.record_sha256,createHash('sha256').update(await readFile(join(base,'showcase.json'),'utf8')).digest('hex'));
  assert.equal(manifest.hashes.front_sha256,createHash('sha256').update(front).digest('hex'));
  assert.match(front,/OBSERVED COUNTERPARTY ASSET/);
  assert.match(front,/NEO Bond Showcase/);
  assert.match(back,/PROVENANCE/);
  for(const svg of [front,back])assert.doesNotMatch(svg,/<script|<foreignObject|onload=|<iframe/i);
  assert.equal(receipt.tx_hash,tx);
  assert.equal(receipt.public_metadata_confirmed,true);
  assert.ok(network.calls.some(x=>x.url===canonical));
  assert.ok(network.calls.some(x=>x.url===api+'/issuances/'+tx));
});
test('re-running a confirmed creation is idempotent and preserves first readback timestamp',async t=>{
  const root=await temp(t),intent=approved();
  await stageApprovedMetadata(intent,{root});
  const first=await stageConfirmedNeoShowcase(intent,{root,fetchImpl:stub().fetchImpl,clock});
  const before=await readFile(join(filesFor(root),'showcase.json'),'utf8');
  const later=await stageConfirmedNeoShowcase(intent,{
    root,fetchImpl:stub().fetchImpl,clock:()=>new Date('2026-10-26T08:33:00Z')
  });
  assert.equal(first.written,true);
  assert.equal(later.written,false);
  assert.ok(Object.values(later.states).every(status=>status==='unchanged'));
  assert.equal(await readFile(join(filesFor(root),'showcase.json'),'utf8'),before);
  assert.equal(first.record_sha256,later.record_sha256);
});
test('a conflicting previously published card is never silently replaced',async t=>{
  const root=await temp(t),intent=approved();
  await stageApprovedMetadata(intent,{root});
  await stageConfirmedNeoShowcase(intent,{root,fetchImpl:stub().fetchImpl,clock});
  const oldManifest=await readFile(join(filesFor(root),'showcase-manifest.json'),'utf8');
  await writeFile(join(filesFor(root),'showcase-front.svg'),'<svg>tampered</svg>');
  await assert.rejects(stageConfirmedNeoShowcase(intent,{root,fetchImpl:stub().fetchImpl,clock}),
    /existing_confirmed_showcase_conflict_requires_review/);
  assert.equal(await readFile(join(filesFor(root),'showcase-front.svg'),'utf8'),'<svg>tampered</svg>');
  assert.equal(await readFile(join(filesFor(root),'showcase-manifest.json'),'utf8'),oldManifest);
});
test('historical description change, transfer or incorrect issuer never becomes a new asset',async()=>{
  for(const change of [
    {asset_events:'change_description',quantity:0},
    {asset_events:'transfer',quantity:0},
    {source:'1UnexpectedSource444444444444444444'},
    {issuer:'1UnexpectedSource444444444444444444'},
    {status:'invalid'},
    {description:'https://attacker.example/not-neo'},
    {quantity:2000},
    {transfer:true}
  ]){
    const state=payloads();
    const first=state['/assets/'+asset+'/issuances?limit=100'].result[1];
    Object.assign(first,change);
    const net=stub({routes:state});
    if(['change_description','transfer'].includes(change.asset_events)){
      const result=await observeApprovedCrownCreation(approved(),{fetchImpl:net.fetchImpl});
      assert.equal(result.status,'pending');
    }else{
      await assert.rejects(observeApprovedCrownCreation(approved(),{fetchImpl:net.fetchImpl}));
    }
  }
});
test('ambiguous or incomplete creation event enumeration fails closed',async()=>{
  const state=payloads();
  state['/assets/'+asset+'/issuances?limit=100'].result.push(creation());
  state['/assets/'+asset+'/issuances?limit=100'].result_count=3;
  await assert.rejects(observeApprovedCrownCreation(approved(),{fetchImpl:stub({routes:state}).fetchImpl}),
    /ambiguous_creation_event/);
  const truncated=payloads();
  truncated['/assets/'+asset+'/issuances?limit=100'].next_cursor=123;
  await assert.rejects(observeApprovedCrownCreation(approved(),{fetchImpl:stub({routes:truncated}).fetchImpl}),
    /issuance_event_history_truncated/);
});
test('bad signer-approved transaction hash and unsupported showcase type fail without file publication',async t=>{
  const root=await temp(t);
  const badTx=approved({tx_hash:'c'.repeat(64)});
  await assert.rejects(observeApprovedCrownCreation(badTx,{fetchImpl:stub().fetchImpl}),/approved_tx_hash_conflicts_with_creation/);
  await assert.rejects(stageConfirmedNeoShowcase(approved({showcase:{instrument_type:'verified_public_security'}}),{root,fetchImpl:stub().fetchImpl}),
    /invalid_approved_instrument_category/);
  await assert.rejects(stageConfirmedNeoShowcase(approved({approval:{state:'not_approved'}}),{root,fetchImpl:stub().fetchImpl}),
    /operator_review_required/);
  await assert.rejects(readFile(join(filesFor(root),'showcase.json')),{code:'ENOENT'});
});
test('unavailable NEO canonical metadata and confirmations below threshold block card publication',async t=>{
  const root=await temp(t),intent=approved();
  await stageApprovedMetadata(intent,{root});
  await assert.rejects(stageConfirmedNeoShowcase(intent,{
    root,fetchImpl:stub({canonicalStatus:503}).fetchImpl,clock
  }),/canonical_metadata_http_or_redirect_failure/);
  const routes=payloads();
  routes['/blocks/last'].result.block_index=1003;
  await assert.rejects(stageConfirmedNeoShowcase(intent,{
    root,fetchImpl:stub({routes}).fetchImpl,clock
  }),/insufficient_confirmations/);
  await assert.rejects(readFile(join(filesFor(root),'showcase.json')),{code:'ENOENT'});
});
test('unapproved additional supply, missing divisibility, or changed owner block published card',async t=>{
  const root=await temp(t),intent=approved();
  await stageApprovedMetadata(intent,{root});
  for(const change of [
    {supply:2000},{supply:null},{divisible:null},{owner:'1OtherWallet11111111111111111111'}
  ]){
    const state=payloads();
    Object.assign(state['/assets/'+asset].result,change);
    await assert.rejects(stageConfirmedNeoShowcase(intent,{
      root,fetchImpl:stub({routes:state}).fetchImpl,clock
    }));
    await assert.rejects(readFile(join(filesFor(root),'showcase.json')),{code:'ENOENT'});
  }
});
test('insurance-policy card does not publish policyholder names from reviewed title or claimant narrative',async t=>{
  const root=await temp(t),intent=approved({
    showcase:{instrument_type:'insurance_policy',style:'emerald',public_title:'Private Claimant Name'},
    metadata:{...approved().metadata,description:'An operator approved policy narrative that contains claimant claims.'}
  });
  await stageApprovedMetadata(intent,{root});
  const network=stub();
  // Match approved public JSON, not a different mock; only approved value may reach readback.
  const fetchImpl=async (url,options)=>{
    if(url===canonical)return new Response(JSON.stringify(intent.metadata),{
      status:200,headers:{'content-type':'application/json'}
    });
    return network.fetchImpl(url,options);
  };
  await stageConfirmedNeoShowcase(intent,{root,fetchImpl,clock});
  const record=JSON.parse(await readFile(join(filesFor(root),'showcase.json'),'utf8'));
  assert.equal(record.payload.display_title,asset);
  assert.doesNotMatch(JSON.stringify(record),/Private Claimant Name/);
  assert.match(record.payload.instrument.description,/intentionally omitted/);
});
