import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrownMetadataReadinessService} from './metadata-readiness.mjs';

const asset='NOMNI';
const canonical='https://crown.holytemples.org/assets/NOMNI/tokenscan.json';
const mirror='https://neo-crown-cardmaster-staging.onrender.com/assets/NOMNI/tokenscan.json';
const core='https://api.counterparty.io:4000/v2/assets/NOMNI';
const tokenscan='https://tokenscan.io/api/asset/NOMNI';
const metadata={asset,description:'NOMNI identification only. No verified prices or reserve claims.',website:'https://neo-crown-cardmaster-runtime.onrender.com/'};
const now=()=>new Date('2026-10-25T22:00:00.000Z');

function mock(overrides={}){
  const requests=[];
  const responses={
    [canonical]:{body:metadata},
    [mirror]:{body:{website:metadata.website,description:metadata.description,asset}},
    [core]:{body:{result:{asset,description:canonical,issuer:'1EXAMPLE'}}},
    [tokenscan]:{body:{asset,description:canonical,owner:'1ANOTHER'}}
  };
  for(const [url,change] of Object.entries(overrides))responses[url]={...responses[url],...change};
  const fetchImpl=async (url,options)=>{
    requests.push({url,options});
    if(!responses[url])throw Error('unexpected_external_request');
    const state=responses[url];
    if(state.error)throw state.error;
    return new Response(state.raw??JSON.stringify(state.body),{
      status:state.status??200,
      headers:{'content-type':state.mime??'application/json',...(state.location?{location:state.location}: {})}
    });
  };
  const service=createCrownMetadataReadinessService({fetchImpl,now});
  return {service,requests};
}
test('canonical and mirror valid, on-chain pointers match; explorer enrichment remains unverified',async()=>{
  const {service,requests}=mock();
  const result=await service.inspect(asset,metadata);
  assert.equal(result.schema,'neo.crown.metadata-readiness.v1');
  assert.equal(result.status,'canonical_ready_explorer_enrichment_unverified');
  assert.equal(result.canonical.state,'matches_approved');
  assert.equal(result.mirror.state,'matches_approved');
  assert.equal(result.counterparty.state,'points_to_canonical');
  assert.equal(result.tokenscan.state,'points_to_canonical');
  assert.equal(result.explorer_additional_information_verified,false);
  assert.equal(result.safe_to_issue,false);
  assert.equal(result.price,null);
  assert.equal(result.read_only,true);
  assert.deepEqual(requests.map(x=>x.url),[canonical,mirror,core,tokenscan]);
  for(const {options} of requests)assert.equal(options.redirect,'error');
});
test('canonical 404 or 503 cannot be falsely classified as metadata ready',async()=>{
  for(const status of [404,503]){
    const {service}=mock({[canonical]:{status}});
    const result=await service.inspect(asset,metadata);
    assert.equal(result.status,'canonical_blocked');
    assert.equal(result.canonical.state,'unavailable');
    assert.equal(result.canonical.http_status,status);
    assert.equal(result.safe_to_issue,false);
  }
});
test('wrong canonical JSON asset, unknown keys, HTML and redirects fail closed',async()=>{
  for(const config of [
    {body:{asset:'WRONG',description:metadata.description}},
    {body:{...metadata,private_key:'hidden'}},
    {mime:'text/html'},
    {status:302,location:'https://neo-crown-cardmaster-staging.onrender.com'},
    {raw:JSON.stringify({...metadata})+'x'},
    {raw:'z'.repeat(20000)}
  ]){
    const {service}=mock({[canonical]:config});
    const result=await service.inspect(asset,metadata);
    assert.equal(result.status,'canonical_blocked');
    assert.equal(result.safe_to_issue,false);
    assert.notEqual(result.canonical.state,'matches_approved');
  }
});
test('canonical response with a different but valid description requires review',async()=>{
  const {service}=mock({[canonical]:{body:{...metadata,description:'Unapproved edited text'}}});
  const result=await service.inspect(asset,metadata);
  assert.equal(result.canonical.state,'differs_from_approved');
  assert.equal(result.status,'canonical_blocked');
});
test('unavailable static mirror cannot silently authorize publishing',async()=>{
  const {service}=mock({[mirror]:{status:404}});
  const result=await service.inspect(asset,metadata);
  assert.equal(result.status,'mirror_not_verified');
  assert.equal(result.canonical.state,'matches_approved');
  assert.equal(result.safe_to_issue,false);
});
test('changed on-chain description and stale TokenScan pointer have separate statuses',async()=>{
  const changed=mock({[core]:{body:{result:{asset,description:'https://unapproved.example/token.json'}}}});
  assert.equal((await changed.service.inspect(asset,metadata)).status,'counterparty_pointer_not_verified');
  const stale=mock({[tokenscan]:{body:{asset,description:'https://unapproved.example/token.json'}}});
  const result=await stale.service.inspect(asset,metadata);
  assert.equal(result.status,'tokenscan_pointer_not_verified');
  assert.equal(result.tokenscan.state,'different_description');
  assert.equal(result.explorer_additional_information_verified,false);
});
test('source network failure and invalid Counterparty data stay unverified',async()=>{
  const down=mock({[core]:{error:new Error('offline')}});
  assert.equal((await down.service.inspect(asset,metadata)).counterparty.state,'unavailable');
  const malformed=mock({[core]:{body:{result:null}}});
  assert.equal((await malformed.service.inspect(asset,metadata)).counterparty.state,'invalid');
});
test('asset names and local approved JSON must pass validation before network fetch',async()=>{
  const {service,requests}=mock();
  await assert.rejects(service.inspect('../NOMNI',metadata),/invalid_asset/);
  await assert.rejects(service.inspect('NOMNI',{...metadata,asset:'WRONG'}),/asset_or_description_mismatch/);
  await assert.rejects(service.inspect('NOMNI',{...metadata,balance:300}),/unsupported_enhanced_field/);
  assert.equal(requests.length,0);
});
test('strict caching and single-flight prevent repeated public API amplification',async()=>{
  const {service,requests}=mock();
  const [first,second]=await Promise.all([service.inspect(asset,metadata),service.inspect(asset,metadata)]);
  assert.deepEqual(first,second);
  await service.inspect(asset,metadata);
  assert.equal(requests.length,4);
});
