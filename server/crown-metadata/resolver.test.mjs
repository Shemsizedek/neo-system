import {test} from 'node:test';import assert from 'node:assert/strict';
import {publicIpv4,metadataPointer,normalizeMedia,createAssetResolver,renderResolvedAsset} from './resolver.mjs';
import {sha256} from './integrity.mjs';import {createMetadataServer} from './server.mjs';
const ledger={asset:'A12593823404439585631',asset_longname:'NEONS.PAPILLON',owner:'fixture',supply:'20',locked:true,description:'https://ardrive.net/fixture.json'};
const metadata={asset:'NEONS.PAPILLON',image:'https://arweave.net/small',image_large:'https://arweave.net/large',files:[{type:'pdf',name:'PDF',data:'https://example.org/a.pdf'}],audio:[{type:'mp3',data:'https://example.org/a.mp3'}],video:[{type:'mp4',data:'https://example.org/a.mp4'}],website:'https://example.org',html:'<script>alert(1)</script><h2>Info</h2>'};
test('resolver supports subasset identities and legacy extensionless artwork without wallet filtering',async()=>{
 const resolve=createAssetResolver({fetchLedger:async()=>ledger,fetchMetadata:async()=>({json:metadata,bytes:Buffer.from(JSON.stringify(metadata)),url:ledger.description})});const r=await resolve('NEONS.PAPILLON');assert.equal(r.metadata_status,'RESOLVED');assert.equal(r.media.items.filter(x=>x.kind==='image').length,2);assert.equal(r.canonical_asset,ledger.asset);assert.equal(r.blockchain_anchor_verified,false);
 const page=renderResolvedAsset(r);assert.ok(page.includes('sandbox=""'));assert.ok(!page.includes('<script>alert'));assert.ok(page.includes('&lt;script&gt;'));assert.ok(page.includes('example.org/a.pdf'));
});
test('hash and identity mismatch fail closed, HTML link schemes are rejected',async()=>{
 const b=Buffer.from(JSON.stringify(metadata));const resolve=createAssetResolver({fetchLedger:async()=>({...ledger,description:ledger.description+';'+'0'.repeat(64)}),fetchMetadata:async()=>({json:metadata,bytes:b})});assert.equal((await resolve('NEONS.PAPILLON')).error,'metadata_hash_mismatch');
 const wrong=createAssetResolver({fetchLedger:async()=>ledger,fetchMetadata:async()=>({json:{asset:'WRONG'},bytes:b})});assert.equal((await wrong('X')).metadata_status,'UNAVAILABLE');assert.equal(normalizeMedia({image:'javascript:alert(1)'}).items.length,0);
 assert.equal(metadataPointer('ipfs:CID').url,'https://ipfs.io/ipfs/CID');assert.equal(metadataPointer('ordinary text'),null);assert.equal(metadataPointer(ledger.description+';'+sha256(b)).expectedHash,sha256(b));
});
test('private and reserved DNS targets rejected before pinned requests',()=>{for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.1.1','0.0.0.0','224.0.0.1','198.18.0.1'])assert.equal(publicIpv4(ip),false);assert.equal(publicIpv4('8.8.8.8'),true);});
test('HTTP viewer resolves any asset; hosted Crown metadata remains separate',async t=>{
 const server=createMetadataServer({store:{get:async()=>null},resolveAsset:async asset=>({canonical_asset:ledger.asset,asset_longname:asset,ledger,metadata_status:'RESOLVED',metadata,media:normalizeMedia(metadata)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}`;
 const r=await fetch(base+'/assets/NEONS.PAPILLON/resolve.json');assert.equal(r.status,200);assert.equal((await r.json()).crown_enrichment,null);assert.equal((await fetch(base+'/assets/explore?asset=NEONS.PAPILLON')).status,200);
});
