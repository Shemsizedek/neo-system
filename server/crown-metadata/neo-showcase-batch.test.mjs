import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {runNeoShowcaseBatch} from './neo-showcase-batch.mjs';
import {crownIssuanceDescription} from './issuance-autopublish.mjs';
import {stageApprovedMetadata} from './issuance-publication.mjs';

const id='NEOFUND',wallet='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk',tx='a'.repeat(64);
const canonical=crownIssuanceDescription(id);
function intent(){
  return {
    schema:'neo.crown.issuance-intent.v1',operation:'initial_issuance',network:'bitcoin-mainnet',
    protocol:'counterparty',asset:id,owner_address:wallet,issuer_address:wallet,quantity_raw:'25',
    tx_hash:null,asset_description_for_signer:canonical,
    metadata:{asset:id,description:'An NEO asset. Legal and financial terms unverified.',website:'https://holytemples.org/'},
    approval:{state:'approved_for_metadata_publication',review_reference:'https://github.com/Shemsizedek/neo-system/pull/1236'},
    showcase:{instrument_type:'investment_pool',style:'violet',public_title:'NEO Fund'}
  };
}
async function dir(t){
  const root=await mkdtemp(join(tmpdir(),'neo-batch-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'server/crown-metadata/approved-intents'),{recursive:true});
  return root;
}
async function addIntent(root,object=intent()){
  const path=join(root,'server/crown-metadata/approved-intents',object.asset+'.json');
  await mkdir(dirname(path),{recursive:true});
  await writeFile(path,JSON.stringify(object,null,2)+'\n');
}
function mock({issued=true}={}){
  const result={
    '/assets/'+id+'/issuances?limit=100':{result:issued?[{
      asset:id,asset_events:'creation',tx_hash:tx,block_index:1000,source:wallet,issuer:wallet,
      quantity:25,description:canonical,status:'valid',transfer:false
    }]:[],result_count:issued?1:0,next_cursor:null},
    '/':{result:{server_ready:true,network:'mainnet',ledger_state:'Following',counterparty_height:1020}},
    '/assets/'+id:{result:{
      asset:id,asset_longname:null,owner:wallet,issuer:wallet,description:canonical,supply:25,
      divisible:false,locked:true,first_issuance_block_index:1000
    }},
    '/issuances/'+tx:{result:{
      asset:id,asset_events:'creation',tx_hash:tx,block_index:1000,source:wallet,issuer:wallet,
      quantity:25,description:canonical,status:'valid',transfer:false
    }},
    '/blocks/last':{result:{block_index:1020,block_hash:'e'.repeat(64)}},
    '/blocks/1000':{result:{block_index:1000,block_hash:'c'.repeat(64)}}
  };
  let calls=0;
  const fetchImpl=async url=>{
    calls++;
    if(url===canonical)return new Response(JSON.stringify(intent().metadata),{
      status:200,headers:{'content-type':'application/json'}
    });
    const key=url.replace('https://api.counterparty.io:4000/v2','');
    if(!result[key])throw Error('unexpected_provider_url');
    return new Response(JSON.stringify(result[key]),{
      status:200,headers:{'content-type':'application/json'}
    });
  };
  return {fetchImpl,count:()=>calls};
}
const clock=()=>new Date('2026-10-25T23:59:00Z');

test('no approved issuance intents is not a false success or a published card',async t=>{
  const root=await dir(t),net=mock();
  const result=await runNeoShowcaseBatch({root,fetchImpl:net.fetchImpl});
  assert.equal(result.result,'NO_APPROVED_ISSUANCE_INTENTS');
  assert.equal(result.assets_reviewed,0);
  assert.equal(result.all_approved_issuances_confirmed,false);
  assert.equal(result.public_hosting_verified,false);
  assert.equal(net.count(),0);
});
test('new instrument without chain creation is pending rather than publicly issued',async t=>{
  const root=await dir(t);
  await addIntent(root);
  const network=mock({issued:false});
  const result=await runNeoShowcaseBatch({root,fetchImpl:network.fetchImpl,mode:'stage-confirmed',clock});
  assert.equal(result.pending,1);
  assert.equal(result.confirmed,0);
  assert.equal(result.changed,0);
  assert.equal(result.blocked,0);
  assert.equal(result.results[0].state,'PENDING_CREATION_EVENT');
  await assert.rejects(readFile(join(root,'apps/neoscan/web/cardmaster/assets',id,'showcase.json')),{code:'ENOENT'});
});
test('inspection mode never creates files even when an asset creation event exists',async t=>{
  const root=await dir(t);
  await addIntent(root);
  const result=await runNeoShowcaseBatch({root,fetchImpl:mock().fetchImpl,mode:'inspect'});
  assert.equal(result.pending,1);
  assert.equal(result.results[0].state,'CREATION_SEEN_REQUIRES_CONFIRMATIONS');
  assert.equal(result.results[0].tx_hash,tx);
  await assert.rejects(readFile(join(root,'server/crown-metadata/issuance-receipts',id+'.json')),{code:'ENOENT'});
});
test('approved observed issuance auto-builds confirmed files and can be retried safely',async t=>{
  const root=await dir(t),i=intent(),net=mock();
  await addIntent(root,i);
  await stageApprovedMetadata(i,{root});
  const first=await runNeoShowcaseBatch({root,fetchImpl:net.fetchImpl,mode:'stage-confirmed',clock});
  assert.equal(first.result,'CONFIRMED_FILES_STAGED');
  assert.equal(first.confirmed,1);
  assert.equal(first.changed,1);
  assert.equal(first.blocked,0);
  assert.equal(first.all_approved_issuances_confirmed,true);
  const json=JSON.parse(await readFile(join(root,'apps/neoscan/web/cardmaster/assets',id,'showcase.json'),'utf8'));
  assert.equal(json.payload.classification.type,'investment_pool');
  const second=await runNeoShowcaseBatch({
    root,fetchImpl:mock().fetchImpl,mode:'stage-confirmed',
    clock:()=>new Date('2026-10-26T09:00:00Z')
  });
  assert.equal(second.changed,0);
  assert.equal(second.confirmed,1);
  assert.equal(second.blocked,0);
});
test('unapproved files and malformed categories are explicit blockers, never silent batch promotion',async t=>{
  const root=await dir(t),invalid=intent();
  invalid.approval.state='PENDING';
  await addIntent(root,invalid);
  const network=mock();
  const result=await runNeoShowcaseBatch({root,fetchImpl:network.fetchImpl,mode:'stage-confirmed'});
  assert.equal(result.blocked,1);
  assert.equal(result.all_approved_issuances_confirmed,false);
  assert.equal(result.results[0].state,'BLOCKED');
  assert.equal(network.count(),0);
});
test('asset file limit and unsupported batch mode fail before fetching any issuer data',async t=>{
  const root=await dir(t);
  const path=join(root,'server/crown-metadata/approved-intents');
  for(let i=0;i<31;i++)await writeFile(join(path,'NEO'+String(i).padStart(3,'0')+'.json'),'{}');
  await assert.rejects(runNeoShowcaseBatch({root}),/approved_asset_limit_exceeded/);
  await assert.rejects(runNeoShowcaseBatch({root,mode:'upload_unverified'}),/unsupported_neo_showcase_batch_mode/);
});
