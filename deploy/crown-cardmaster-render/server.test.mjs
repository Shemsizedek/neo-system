import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrownRenderServer} from './server.mjs';
import {createCardmasterHandler} from '../../api/crown/cardmaster.mjs';

async function withServer(t,options={}) {
  const server=createCrownRenderServer(options);
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  t.after(async()=>await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve())));
  return 'http://127.0.0.1:'+server.address().port;
}
const fixedNow=new Date('2026-10-23T05:00:00.000Z');
const unverifiedTicker={async fx(){return {generatedAt:fixedNow.toISOString(),quotes:[{pair:'NOMNI/USD',mid:5000,source:'Counterparty DEX',confidence:'derived-from-dex',status:'live'}]};}};
const dummyHandler=createCardmasterHandler({tickerService:unverifiedTicker,now:()=>fixedNow});

test('health and robots are read-only and disclose no secrets',async t=>{
  const url=await withServer(t,{apiHandler:dummyHandler});
  const r=await fetch(url+'/healthz');
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{service:'neo-crown-cardmaster',gate:'NCC-007',status:'ok',read_only:true,market_data:'source_attributed_only'});
  assert.equal((await fetch(url+'/robots.txt').then(r=>r.text())).includes('Disallow: /'),true);
  assert.equal((await fetch(url+'/healthz',{method:'POST'})).status,405);
});
test('serves only an allowlisted static gallery with strict security headers',async t=>{
  const url=await withServer(t,{apiHandler:dummyHandler});
  const html=await fetch(url+'/');
  assert.equal(html.status,200);
  assert.match(html.headers.get('content-type'),/text\/html/);
  assert.match(html.headers.get('content-security-policy'),/script-src 'self'/);
  assert.match(await html.text(),/noindex,nofollow/);
  assert.equal((await fetch(url+'/app.js')).status,200);
  assert.equal((await fetch(url+'/catalog.js')).status,200);
  const svg=await fetch(url+'/art/NEO-CARD-000001-front.svg');
  assert.equal(svg.status,200);
  assert.match(svg.headers.get('content-type'),/svg/);
  assert.match(svg.headers.get('content-security-policy'),/sandbox/);
  assert.match(await svg.text(),/<svg/);
  const head=await fetch(url+'/art/NEO-CARD-000001-front.svg',{method:'HEAD'});
  assert.equal(head.status,200);
  assert.equal((await head.text()).length,0);
  assert.equal((await fetch(url+'/.git/config')).status,404);
  assert.equal((await fetch(url+'/secrets.txt')).status,404);
  assert.equal((await fetch(url+'/art/BAD-front.svg')).status,404);
  assert.equal((await fetch(url+'/',{method:'POST'})).status,405);
});
test('JSON endpoint connects but does not display fabricated NOMNI market price',async t=>{
  const url=await withServer(t,{apiHandler:dummyHandler});
  const resp=await fetch(url+'/api/crown/cardmaster');
  assert.equal(resp.status,200);
  assert.match(resp.headers.get('content-type'),/json/);
  const deck=await resp.json();
  assert.equal(deck.schema,'NEO-CARDMASTER-COLLECTION-V1');
  assert.equal(deck.cards.length,3);
  assert.equal(deck.cards[0].market_data.state,'unavailable');
  assert.equal(deck.cards[0].market_data.quote,null);
  assert.match(deck.cards[0].market_data.reason,/timestamp/);
  assert.equal(deck.cards[1].market_data.quote,null);
});
test('SVG API remains script-free and rejects writes or unknown cards',async t=>{
  const url=await withServer(t,{apiHandler:dummyHandler});
  const svg=await fetch(url+'/api/crown/cardmaster?format=svg&card_id=NEO-CARD-000002&face=back');
  assert.equal(svg.status,200);
  assert.match(svg.headers.get('content-type'),/svg/);
  assert.doesNotMatch(await svg.text(),/<script/);
  assert.equal((await fetch(url+'/api/crown/cardmaster?format=svg&card_id=invalid')).status,404);
  assert.equal((await fetch(url+'/api/crown/cardmaster',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/api/crown/cardmaster?format=html')).status,400);
  const evil=await fetch(url+'/api/crown/cardmaster',{headers:{Origin:'https://untrusted.example'}});
  assert.equal(evil.headers.get('access-control-allow-origin'),null);
});

test('NCC-008 evidence route separates empty market, failure and read-only methods',async t=>{
  const evidenceService={async observe(){return {schema:'neo.crown.counterparty.order-evidence.v1',price:null,market_quote_verified:false,source_status:'observed',pairs:[{pair:'NOMNI/XCP',status:'no_open_orders',open_order_count:0},{pair:'NOMNI/BTC',status:'no_open_orders',open_order_count:0}]};}};
  const url=await withServer(t,{apiHandler:dummyHandler,evidenceService});
  const r=await fetch(url+'/api/crown/order-evidence');
  assert.equal(r.status,200);
  assert.match(r.headers.get('content-type'),/application\/json/);
  assert.equal((await r.json()).pairs[0].open_order_count,0);
  assert.equal((await fetch(url+'/api/crown/order-evidence',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/api/crown/order-evidence',{method:'HEAD'})).status,405);
  const fail=await withServer(t,{apiHandler:dummyHandler,evidenceService:{async observe(){throw new Error('upstream');}}});
  const bad=await fetch(fail+'/api/crown/order-evidence');
  assert.equal(bad.status,503);
});


test('NCC-009 Artwork Studio serves allowlisted local design files under restrictive CSP',async t=>{
  const url=await withServer(t,{apiHandler:dummyHandler});
  const page=await fetch(url+'/studio/');
  assert.equal(page.status,200);
  assert.match(page.headers.get('content-type'),/text\/html/);
  assert.match(page.headers.get('content-security-policy'),/script-src 'self'/);
  assert.match(page.headers.get('content-security-policy'),/img-src 'self' blob:/);
  const html=await page.text();
  assert.match(html,/CARDMASTER STUDIO|CARDMASTER <span class="brand-soft">STUDIO/);
  assert.match(html,/noindex,nofollow/);
  const scripts=['/studio/studio-core.mjs','/studio/studio-app.mjs'];
  for(const path of scripts){
    const r=await fetch(url+path);
    assert.equal(r.status,200);
    assert.match(r.headers.get('content-type'),/text\/javascript/);
    assert.ok((await r.text()).length>250);
  }
  const css=await fetch(url+'/studio/studio.css');
  assert.equal(css.status,200);
  assert.match(css.headers.get('content-type'),/text\/css/);
  assert.equal((await fetch(url+'/studio',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/studio/../../.env')).status,404);
  assert.equal((await fetch(url+'/studio/manifest.json')).status,404);
});


test('NCC-010 media modules are allowlisted while server-side uploads stay disabled',async t=>{
  const url=await withServer(t,{apiHandler:dummyHandler});
  for(const module of ['media-core.mjs','media-store.mjs','media-ui.mjs']){
    const resp=await fetch(url+'/studio/'+module);
    assert.equal(resp.status,200,module);
    assert.match(resp.headers.get('content-type'),/text\/javascript/);
    assert.ok((await resp.text()).length>900);
  }
  const studio=await fetch(url+'/studio/');
  assert.equal(studio.status,200);
  assert.match(studio.headers.get('content-security-policy'),/img-src 'self' blob: data:/);
  const html=await studio.text();
  assert.match(html,/CROWN MEDIA LIBRARY/);
  assert.match(html,/rights.*permission|permission.*rights/i);
  assert.equal((await fetch(url+'/api/crown/media/upload',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/studio/media-config.json')).status,404);
  assert.equal((await fetch(url+'/studio/media-core.mjs',{method:'PUT'})).status,405);
});


test('NCC-012 NOMNI enhanced metadata is direct no-redirect JSON and public writes stay denied',async t=>{
  const url=await withServer(t,{apiHandler:dummyHandler});
  const response=await fetch(url+'/assets/NOMNI/tokenscan.json',{redirect:'manual'});
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/application\/json/);
  assert.equal(response.headers.get('location'),null);
  const info=await response.json();
  assert.equal(info.asset,'NOMNI');
  assert.equal(typeof info.description,'string');
  assert.ok(info.description.length<=2048);
  assert.equal(info.website.startsWith('https://'),true);
  assert.equal((await fetch(url+'/assets/NOMNI/manifest.json')).status,200);
  assert.equal((await fetch(url+'/assets/NOMNI/tokenscan.json',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/assets/NOTISSUED/tokenscan.json')).status,404);
  assert.equal((await fetch(url+'/assets/%2e%2e/tokenscan.json')).status,404);
  assert.equal((await fetch(url+'/assets/NOMNI/private.json')).status,404);
});


test('NCC-014 publishes a read-only metadata dashboard with strict CSP and allowlisted assets',async t=>{
  let inspected=0;
  const metadataService={async inspect(asset,approved){
    inspected++;
    assert.equal(asset,'NOMNI');
    assert.equal(approved.asset,'NOMNI');
    return {schema:'neo.crown.metadata-readiness.v1',asset,status:'canonical_blocked',read_only:true,safe_to_issue:false,price:null,explorer_additional_information_verified:false};
  }};
  const url=await withServer(t,{apiHandler:dummyHandler,metadataService});
  const page=await fetch(url+'/metadata/');
  assert.equal(page.status,200);
  assert.match(page.headers.get('content-type'),/text\/html/);
  assert.match(page.headers.get('content-security-policy'),/script-src 'self'/);
  const html=await page.text();
  assert.match(html,/METADATA OBSERVABILITY/);
  assert.match(html,/noindex,nofollow/);
  assert.match(html,/canonical\.holytemples\.org|crown\.holytemples\.org/);
  const js=await fetch(url+'/metadata/app.js');
  assert.equal(js.status,200);
  assert.match(js.headers.get('content-type'),/text\/javascript/);
  assert.match(await js.text(),/metadata-readiness/);
  const css=await fetch(url+'/metadata/styles.css');
  assert.equal(css.status,200);
  assert.match(css.headers.get('content-type'),/text\/css/);
  const result=await fetch(url+'/api/crown/metadata-readiness?asset=NOMNI');
  assert.equal(result.status,200);
  assert.match(result.headers.get('content-type'),/application\/json/);
  assert.equal((await result.json()).safe_to_issue,false);
  assert.equal(inspected,1);
  assert.equal((await fetch(url+'/api/crown/metadata-readiness?asset=../../etc')).status,400);
  assert.equal((await fetch(url+'/api/crown/metadata-readiness?asset=NOMNI&asset=NOTNOMNI')).status,400);
  assert.equal((await fetch(url+'/api/crown/metadata-readiness?asset=NOTISSUED')).status,404);
  assert.equal((await fetch(url+'/api/crown/metadata-readiness',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/api/crown/metadata-readiness',{method:'HEAD'})).status,405);
  assert.equal((await fetch(url+'/metadata/private.json')).status,404);
  assert.equal((await fetch(url+'/metadata/',{method:'POST'})).status,405);
});
test('NCC-014 upstream observer failure never changes token state or leaks its error',async t=>{
  const metadataService={async inspect(){throw Error('secret_or_sensitive_internal_detail');}};
  const url=await withServer(t,{apiHandler:dummyHandler,metadataService});
  const response=await fetch(url+'/api/crown/metadata-readiness');
  assert.equal(response.status,503);
  const body=await response.text();
  assert.match(body,/metadata_readiness_unavailable/);
  assert.doesNotMatch(body,/secret_or_sensitive_internal_detail/);
});


test('NCC-015 Layer 3 studio serves an accessible on-demand generator without weakening CSP',async t=>{
  const url=await withServer(t,{apiHandler:dummyHandler});
  const page=await fetch(url+'/showcase/');
  assert.equal(page.status,200);
  assert.match(page.headers.get('content-type'),/text\/html/);
  assert.match(page.headers.get('content-security-policy'),/script-src 'self'/);
  const html=await page.text();
  assert.match(html,/TOKEN SHOWCASE FORGE/);
  assert.match(html,/UNISSUED|Unissued/);
  assert.match(html,/noindex,nofollow/);
  assert.match(html,/Export 2× print file/);
  for(const [path,mime] of [['/showcase/app.js','text\/javascript'],['/showcase/styles.css','text\/css']]){
    const response=await fetch(url+path);
    assert.equal(response.status,200,path);
    assert.match(response.headers.get('content-type'),new RegExp(mime));
    assert.ok((await response.text()).length>2000);
  }
  const gallery=await (await fetch(url+'/')).text();
  assert.match(gallery,/\/showcase\//);
  assert.equal((await fetch(url+'/showcase/',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/showcase/private.json')).status,404);
});
test('NCC-015 on-demand observed NOMNI card uses public Counterparty record but no verified title, wallet or price',async t=>{
  let count=0;
  const showcaseResolver=async asset=>{
    count++;
    assert.equal(asset,'NOMNI');
    return {
      requested_asset:asset,canonical_asset:asset,
      observed_at:'2026-10-25T22:58:00Z',metadata_status:'UNAVAILABLE',
      ledger:{asset:'NOMNI',owner:'18FyntJG9hdXYvanm67mGgbyo1P7adckvg',issuer:'1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk',supply:'900719925474099312345',divisible:true,locked:true,description:'https://crown.holytemples.org/assets/NOMNI/tokenscan.json'},
      metadata:null,media:{items:[]}
    };
  };
  const url=await withServer(t,{apiHandler:dummyHandler,showcaseResolver});
  const json=await fetch(url+'/api/crown/showcase?asset=NOMNI&format=json');
  assert.equal(json.status,200);
  const item=await json.json();
  assert.equal(item.payload.mode,'OBSERVED_COUNTERPARTY_ASSET');
  assert.equal(item.payload.protocol,'counterparty');
  assert.equal(item.payload.ledger.supply_raw,'900719925474099312345');
  assert.equal(item.payload.provenance.ledger_observed,true);
  assert.equal(item.payload.provenance.issuer_control_verified,false);
  assert.equal(item.payload.market.price,null);
  assert.equal(item.payload.issuance.safe_to_issue,false);
  assert.equal(item.read_only,true);
  const svg=await fetch(url+'/api/crown/showcase?asset=NOMNI&format=svg&face=front&style=aurum');
  assert.equal(svg.status,200);
  assert.match(svg.headers.get('content-type'),/svg/);
  assert.match(svg.headers.get('content-security-policy'),/sandbox/);
  const art=await svg.text();
  assert.match(art,/NEO Crown/);
  assert.doesNotMatch(art,/NOMNI/);
  assert.match(art,/OBSERVED COUNTERPARTY ASSET/);
  assert.doesNotMatch(art,/<script|<foreignObject|onload=/i);
  const back=await (await fetch(url+'/api/crown/showcase?asset=NOMNI&format=svg&face=back')).text();
  assert.match(back,/PROVENANCE/);
  assert.match(back,/ON-CHAIN ASSET CODE/);
  assert.match(back,/NOMNI/);
  assert.ok(count>=3);
});
test('NCC-015 preview creates free exportable cards for all categories without contacting the blockchain',async t=>{
  const showcaseResolver=async()=>{throw Error('preview must never call Counterparty');};
  const url=await withServer(t,{apiHandler:dummyHandler,showcaseResolver});
  const json=await fetch(url+'/api/crown/showcase?mode=preview&asset=PROPOSED&type=ignored&instrument_type=bond&network=runes');
  assert.equal(json.status,400);
  const good=await fetch(url+'/api/crown/showcase?mode=preview&asset=PROPOSED&instrument_type=bond&network=runes&style=azurite&title=Crown%20Bond%20Study');
  assert.equal(good.status,200);
  const result=await good.json();
  assert.equal(result.payload.mode,'UNISSUED_DESIGN_PREVIEW');
  assert.equal(result.payload.classification.type,'bond');
  assert.equal(result.payload.classification.status,'USER_SELECTED_PREVIEW_STYLE');
  assert.equal(result.payload.provenance.ledger_observed,false);
  assert.equal(result.payload.ledger.asset,null);
  assert.equal(result.payload.market.price,null);
  assert.equal(result.payload.issuance.safe_to_issue,false);
  assert.ok(result.supported_instrument_types.includes('insurance_policy'));
  assert.ok(result.supported_instrument_types.includes('real_estate'));
  assert.ok(result.supported_instrument_types.includes('nft'));
  const svg=await fetch(url+'/api/crown/showcase?mode=preview&asset=PROPOSED&instrument_type=bond&network=runes&style=azurite&format=svg');
  assert.equal(svg.status,200);
  assert.match(await svg.text(),/UNISSUED/);
});
test('NCC-015 rejects observed asset overrides, writes, malformed paths and unsupported format without network activity',async t=>{
  let calls=0;
  const url=await withServer(t,{apiHandler:dummyHandler,showcaseResolver:async()=>{calls++;throw Error('secret error');}});
  const paths=[
    '/api/crown/showcase?asset=../../etc',
    '/api/crown/showcase?asset=NOMNI&asset=NOTNOMNI',
    '/api/crown/showcase?asset=NOMNI&instrument_type=bond',
    '/api/crown/showcase?asset=NOMNI&title=NotARealIssuer',
    '/api/crown/showcase?asset=NOMNI&mode=preview&instrument_type=security_approved',
    '/api/crown/showcase?asset=NOMNI&format=html',
    '/api/crown/showcase?asset=NOMNI&format=png',
    '/api/crown/showcase?asset=NOMNI&face=middle',
    '/api/crown/showcase?asset=NOMNI&network=runes',
    '/api/crown/showcase?asset=NOMNI&remote=http://attacker',
    '/api/crown/showcase?asset=NOMNI&style=untrusted_color'
  ];
  for(const path of paths){
    const response=await fetch(url+path);
    assert.equal(response.status,400,path);
  }
  for(const method of ['POST','PUT','DELETE','PATCH','HEAD']){
    const response=await fetch(url+'/api/crown/showcase',{method});
    assert.equal(response.status,405,method);
  }
  assert.equal(calls,0);
  const error=await fetch(url+'/api/crown/showcase?asset=NOMNI');
  assert.equal(error.status,503);
  assert.doesNotMatch(await error.text(),/secret error/);
});


test('NCC-016 copied HTML-escaped and social-tracked Layer 3 links generate valid unissued cards',async t=>{
  let observedCalls=0;
  const url=await withServer(t,{apiHandler:dummyHandler,showcaseResolver:async()=>{
    observedCalls++;throw Error('preview_should_not_query_chain');
  }});
  const paths=[
    '/api/crown/showcase?mode=preview&asset=NEOBOND&instrument_type=bond&network=runes&format=json',
    '/api/crown/showcase?mode=preview&amp;asset=NEOBOND&amp;instrument_type=bond&amp;network=runes&amp;format=json',
    '/api/crown/showcase?asset=NEOBOND&mode=preview&instrument_type=bond&network=runes&asset=NEOBOND&format=json'
  ];
  for(const path of paths){
    const response=await fetch(url+path);
    assert.equal(response.status,200,path);
    const card=await response.json();
    assert.equal(card.payload.mode,'UNISSUED_DESIGN_PREVIEW');
    assert.equal(card.payload.asset,'NEOBOND');
    assert.equal(card.payload.classification.type,'bond');
    assert.equal(card.payload.issuance.safe_to_issue,false);
  }
  const decorated=await fetch(url+'/api/crown/showcase?asset=NEOBOND&mode=preview&instrument_type=bond&utm_source=chatgpt&fbclid=source&ref=chat');
  assert.equal(decorated.status,200);
  assert.equal((await decorated.json()).payload.asset,'NEOBOND');
  assert.equal(observedCalls,0);
});
test('NCC-016 identical query keys are idempotent but conflicting values remain blocked with a recovery URL',async t=>{
  let observedCalls=0;
  const url=await withServer(t,{apiHandler:dummyHandler,showcaseResolver:async()=>{
    observedCalls++;throw Error('should_not_query_chain');
  }});
  const good=await fetch(url+'/api/crown/showcase?asset=NEOBOND&asset=NEOBOND&mode=preview&instrument_type=note&instrument_type=note&format=json');
  assert.equal(good.status,200);
  const item=await good.json();
  assert.equal(item.payload.classification.type,'note');
  for(const path of [
    '/api/crown/showcase?asset=NOMNI&asset=NOTNOMNI',
    '/api/crown/showcase?asset=NOMNI&mode=preview&mode=observed',
    '/api/crown/showcase?mode=preview&asset=NEOBOND&issuer_verified=true',
    '/api/crown/showcase?asset=NOMNI&amp;amp;format=svg'
  ]){
    const response=await fetch(url+path);
    assert.equal(response.status,400,path);
    const error=await response.json();
    assert.match(error.message,/Layer 3 studio/);
    assert.equal(error.studio_url,'/showcase/');
    assert.equal(error.issuance_authorized,false);
    assert.notEqual(error.error,'unsupported_or_duplicate_parameter');
  }
  assert.equal(observedCalls,0);
});


test('NCC-017 public pages use the NEO canonical metadata brand without rewriting technical on-chain identifiers',async t=>{
  const url=await withServer(t,{apiHandler:dummyHandler});
  const metadata=await (await fetch(url+'/metadata/')).text();
  assert.match(metadata,/NEO canonical/i);
  assert.match(metadata,/NEO Canonical Metadata/);
  assert.doesNotMatch(metadata,/>NOMNI</);
  const gallery=await (await fetch(url+'/')).text();
  assert.match(gallery,/NEO canonical metadata/);
  const showcase=await (await fetch(url+'/showcase/')).text();
  assert.match(showcase,/NEO canonical metadata/);
  // External Counterparty and explorer links still use the actual immutable asset ID.
  assert.match(metadata,/assets\/NOMNI\/tokenscan\.json/);
});
test('NCC-017 only a committed verified showcase may be served; front/back SVG are read-only and sandboxed',async t=>{
  const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const root=await mkdtemp(join(tmpdir(),'neo-crown-verified-routes-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const directory=join(root,'assets','NEOASSET');
  await mkdir(directory,{recursive:true});
  const manifest={
    schema:'NEO-CROWN-LAYER3-AUTO-PUBLICATION-V1',
    brand:'NEO',canonical_metadata_brand:'NEO canonical metadata',
    status:'CHAIN_CONFIRMED_AWAITING_PUBLIC_HOST_READBACK',
    asset_code:'NEOASSET'
  };
  await writeFile(join(directory,'showcase.json'),JSON.stringify({payload:{asset:'NEOASSET',market:{price:null}},read_only:true}));
  await writeFile(join(directory,'showcase-manifest.json'),JSON.stringify(manifest));
  await writeFile(join(directory,'showcase-front.svg'),'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await writeFile(join(directory,'showcase-back.svg'),'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');
  const url=await withServer(t,{apiHandler:dummyHandler,staticRoot:root});
  for(const file of ['showcase.json','showcase-manifest.json']){
    const response=await fetch(url+'/assets/NEOASSET/'+file,{redirect:'manual'});
    assert.equal(response.status,200,file);
    assert.match(response.headers.get('content-type'),/application\/json/);
    assert.equal(response.headers.get('location'),null);
  }
  for(const face of ['front','back']){
    const response=await fetch(url+'/assets/NEOASSET/showcase-'+face+'.svg');
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/image\/svg\+xml/);
    assert.match(response.headers.get('content-security-policy'),/default-src 'none'; sandbox/);
    assert.match(await response.text(),/<svg/);
  }
  assert.equal((await fetch(url+'/assets/NEOASSET/showcase.json',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/assets/NOTAPPROVED/showcase.json')).status,404);
  assert.equal((await fetch(url+'/assets/NEOASSET/private-key.json')).status,404);
  assert.equal((await fetch(url+'/assets/NEOASSET/showcase-secret.svg')).status,404);
  assert.equal((await fetch(url+'/assets/../NEOASSET/showcase.json')).status,404);
});
