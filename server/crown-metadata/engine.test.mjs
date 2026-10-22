import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAssetRecord,renderCard,resolveDescription,inventoryIssuedAssets} from './engine.mjs';
import {createMetadataServer} from './server.mjs';
const raw={asset:'KNOWINDEX',owner:'fixture-owner',supply:'900719925474099312345',divisible:false,locked:true,description:'fixture'};
const opts={origin:'https://crown.holytemples.org',observedAt:'2026-10-22T12:00:00Z',sourceUrl:'https://tokenscan.io/asset/KNOWINDEX'};
test('preserves exact supply, zero score and unknown claims; content hash is reproducible',()=>{
 const record=createAssetRecord(raw,{neo_score:0},opts),m=record.manifest;
 assert.equal(m.ledger.supply,raw.supply);assert.equal(m.card.neo_score,0);assert.equal(m.card.status,'UNDER REVIEW');assert.equal(m.market_data,null);assert.equal(m.provenance.issuance_verified,false);
 const {content_hash,hash_algorithm,...body}=m;assert.equal(content_hash,createHash('sha256').update(JSON.stringify(body)).digest('hex'));
 assert.ok(record.enhanced.image.endsWith('.png'));assert.ok(record.enhanced.image.length<=100);
 assert.notEqual(m.card_id,createAssetRecord({...raw,asset:'KNOWINDEXA'},{},opts).manifest.card_id);
});
test('rejects imprecise supply and mismatched external identities',()=>{
 assert.throws(()=>createAssetRecord({...raw,supply:1},{},opts));assert.throws(()=>createAssetRecord(raw,{asset:'OTHER'},opts));
});
test('remote manifests are fail closed, bounded and cannot redirect',async()=>{
 await assert.rejects(resolveDescription('https://169.254.169.254/meta.json'));
 await assert.rejects(resolveDescription('http://localhost/a.json'));
 let options;const result=await resolveDescription('https://crown.holytemples.org/x.json',{allowedOrigins:['https://crown.holytemples.org'],fetchImpl:async(u,o)=>{options=o;return new Response('{"asset":"KNOWINDEX"}',{headers:{'content-type':'application/json'}});}});
 assert.equal(result.asset,'KNOWINDEX');assert.equal(options.redirect,'error');
 await assert.rejects(resolveDescription('https://crown.holytemples.org/x.json',{allowedOrigins:['https://crown.holytemples.org'],fetchImpl:async()=>new Response(' '.repeat(66000),{headers:{'content-type':'application/json'}})}));
});
test('cards escape hostile labels',()=>{assert.ok(!renderCard(createAssetRecord(raw,{primary_title:'<script>alert(1)</script>'},opts).manifest).includes('<script>'));});
test('inventory distinguishes issuance from holdings and catches paging loops',async()=>{
 const wallets=[{role:'security',address:'issuer'}];
 const list=await inventoryIssuedAssets(wallets,async()=>({items:[{asset:'A',issuer:'holder'},{asset:'B',issuer:'issuer',tx_hash:'fixture'}]}));assert.deepEqual(list.map(x=>x.asset),['B']);
 await assert.rejects(inventoryIssuedAssets(wallets,async()=>({items:[],next_cursor:'repeat'})),/pagination_loop/);
});
test('explorer retrieves JSON, card and 48x48 PNG over HTTP without writes',async t=>{
 const record=createAssetRecord(raw,{},opts),server=createMetadataServer({store:{get:async a=>a===raw.asset?record:null}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}`;
 const json=await fetch(base+'/assets/KNOWINDEX/info.json');assert.equal(json.status,200);assert.equal(json.headers.get('access-control-allow-origin'),'*');assert.equal((await json.json()).asset,'KNOWINDEX');
 const png=await fetch(base+new URL(record.enhanced.image).pathname);const bytes=Buffer.from(await png.arrayBuffer());assert.equal(bytes.readUInt32BE(16),48);assert.equal(bytes.readUInt32BE(20),48);
 assert.equal((await fetch(base+'/assets/KNOWINDEX/card.svg')).status,200);assert.equal((await fetch(base+'/assets/MISSING/info.json')).status,404);assert.equal((await fetch(base+'/assets/KNOWINDEX/info.json',{method:'POST'})).status,405);
});
test('attachment pages, collectible JSON and individual icons preserve read-only delivery',async t=>{
 const record=createAssetRecord(raw,{},opts);record.manifest.attachments=[{kind:'document',title:'<script>bad</script>',url:'https://example.org/a.pdf'},{kind:'app',title:'bad',url:'javascript:alert(1)'}];
 const server=createMetadataServer({store:{get:async()=>record}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}/assets/KNOWINDEX`;
 const page=await (await fetch(base+'/index.html')).text();assert.ok(page.includes('https://example.org/a.pdf'));assert.ok(!page.includes('javascript:'));assert.ok(!page.includes('<script>'));
 const metadata=await (await fetch(base+'/card.json')).json();assert.equal(metadata.properties.crown.ledger.asset,'KNOWINDEX');assert.equal((await fetch(base+'/icon.png')).headers.get('content-type'),'image/png');
});
