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
