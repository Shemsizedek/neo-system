import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {preparedMetadata,stageApprovedMetadata,verifyCanonicalBeforeSigning,confirmAndRecordIssuance,loadApprovedIntent} from './issuance-publication.mjs';
import {crownIssuanceDescription} from './issuance-autopublish.mjs';

const asset='NEOASSET',address='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk',tx='a'.repeat(64);
const canonical=crownIssuanceDescription(asset);
function approved(txHash){
  return {
    schema:'neo.crown.issuance-intent.v1',operation:'initial_issuance',network:'bitcoin-mainnet',protocol:'counterparty',
    asset,owner_address:address,issuer_address:address,quantity_raw:'101',
    asset_description_for_signer:canonical,
    ...(txHash?{tx_hash:txHash}:{}),
    metadata:{asset,description:'NEO asset presentation only.',website:'https://holytemples.org/'},
    approval:{state:'approved_for_metadata_publication',review_reference:'https://github.com/Shemsizedek/neo-system/pull/1233'}
  };
}
async function temp(t){
  const root=await mkdtemp(join(tmpdir(),'ncc013-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  return root;
}
const pngHash='b'.repeat(64);
function routes(){
  return {
    '/':{result:{server_ready:true,network:'mainnet',ledger_state:'Following',counterparty_height:1011}},
    ['/assets/'+asset]:{result:{asset,owner:address,issuer:address,description:canonical,first_issuance_block_index:1000,locked:false}},
    ['/issuances/'+tx]:{result:{asset,tx_hash:tx,block_index:1000,quantity:101,source:address,issuer:address,description:canonical,status:'valid',transfer:false}},
    '/blocks/last':{result:{block_index:1011,block_hash:'c'.repeat(64)}},
    '/blocks/1000':{result:{block_index:1000,block_hash:pngHash}}
  };
}
function fetcher(custom={},extra={}){
  const state=Object.assign(routes(),custom),calls=[];
  const fetchImpl=async url=>{
    calls.push(url);
    if(url===canonical){
      const status=extra.canonicalStatus??200;
      return new Response(JSON.stringify(extra.canonicalBody??approved().metadata),{status,headers:{'content-type':extra.contentType??'application/json'}});
    }
    const path=url.replace('https://api.counterparty.io:4000/v2','');
    if(!state[path])throw Error('unexpected_provider_url:'+url);
    return new Response(JSON.stringify(state[path]),{status:200,headers:{'content-type':'application/json','X-COUNTERPARTY-READY':'true'}});
  };
  return {fetchImpl,calls};
}
test('approved metadata can be staged before transaction signing, idempotently',async t=>{
  const root=await temp(t),draft=approved();
  const plan=preparedMetadata(draft);
  assert.equal(plan.stage,'OPERATOR_APPROVED_PRE_SIGN_METADATA');
  assert.equal(plan.chain_confirmation_verified,false);
  const a=await stageApprovedMetadata(draft,{root});
  assert.equal(a.state,'created');
  const b=await stageApprovedMetadata(draft,{root});
  assert.equal(b.state,'unchanged');
  const dest=join(root,a.path);
  assert.deepEqual(JSON.parse(await readFile(dest,'utf8')),draft.metadata);
  await writeFile(dest,'{"asset":"TAMPER"}\n');
  await assert.rejects(stageApprovedMetadata(draft,{root}),/existing_publication_conflict/);
});
test('approved intent loading refuses filename traversal and asset mismatch',async t=>{
  const root=await temp(t),intent=approved();
  const path=join(root,'server','crown-metadata','approved-intents',asset+'.json');
  await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(intent));
  assert.equal((await loadApprovedIntent(asset,{root})).asset,asset);
  await assert.rejects(loadApprovedIntent('../admin',{root}),/invalid_approved_intent/);
  await writeFile(path,JSON.stringify({...intent,asset:'WRONG'}));
  await assert.rejects(loadApprovedIntent(asset,{root}),/approved_intent_asset_mismatch/);
});
test('canonical route must be a direct 200 JSON identical to approved metadata',async()=>{
  const intent=approved();
  const good=fetcher();
  const ok=await verifyCanonicalBeforeSigning(intent,{fetchImpl:good.fetchImpl});
  assert.equal(ok.status,'CANONICAL_JSON_VERIFIED');
  assert.deepEqual(good.calls,[canonical]);
  await assert.rejects(verifyCanonicalBeforeSigning(intent,{fetchImpl:fetcher({}, {canonicalStatus:404}).fetchImpl}),/canonical_metadata_http_or_redirect_failure/);
  await assert.rejects(verifyCanonicalBeforeSigning(intent,{fetchImpl:fetcher({}, {canonicalBody:{asset:'WRONG'}}).fetchImpl}),/canonical_content_does_not_match/);
  await assert.rejects(verifyCanonicalBeforeSigning(intent,{fetchImpl:fetcher({}, {contentType:'text/html'}).fetchImpl}),/canonical_metadata_http_or_redirect_failure/);
});
test('only after public staging, live canonical readback and confirmed chain event does receipt persist',async t=>{
  const root=await temp(t),intent=approved(tx),network=fetcher();
  await stageApprovedMetadata(intent,{root});
  const result=await confirmAndRecordIssuance(intent,{root,fetchImpl:network.fetchImpl,clock:()=>new Date('2026-10-25T18:00:00.000Z')});
  assert.equal(result.stage,'CHAIN_CONFIRMED_AND_CANONICAL_VERIFIED');
  assert.equal(result.receipt.confirmations_at_check,12);
  assert.equal(result.receipt.no_token_operation_performed,true);
  assert.equal(result.receipt.third_party_explorer_visibility_confirmed,false);
  assert.equal(result.receipt.issuer_wallet_control_verified_by_crown,false);
  assert.ok(network.calls.includes(canonical));
  assert.ok(network.calls.some(x=>x.endsWith('/issuances/'+tx)));
  const record=JSON.parse(await readFile(join(root,'server','crown-metadata','issuance-receipts',asset+'.json'),'utf8'));
  assert.equal(record.tx_hash,tx);
  const second=await confirmAndRecordIssuance(intent,{root,fetchImpl:fetcher().fetchImpl,clock:()=>new Date('2026-10-25T18:55:00.000Z')});
  assert.equal(second.state,'unchanged');
});
test('missing staged metadata or mismatched canonical JSON prevents chain-confirmation publication',async t=>{
  const root=await temp(t),intent=approved(tx),network=fetcher();
  await assert.rejects(confirmAndRecordIssuance(intent,{root,fetchImpl:network.fetchImpl}),/ENOENT/);
  assert.equal(network.calls.length,0);
  await stageApprovedMetadata(intent,{root});
  await assert.rejects(confirmAndRecordIssuance(intent,{root,fetchImpl:fetcher({}, {canonicalBody:{asset}}).fetchImpl}),/canonical_content_does_not_match/);
  await assert.rejects(readFile(join(root,'server','crown-metadata','issuance-receipts',asset+'.json'),'utf8'),/ENOENT/);
});
test('a previously published different asset description cannot be silently replaced',async t=>{
  const root=await temp(t);
  const original=approved();
  await stageApprovedMetadata(original,{root});
  await assert.rejects(stageApprovedMetadata({...original,metadata:{...original.metadata,description:'New and unapproved copy'}},{root}),/existing_publication_conflict/);
});
