import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='https://crown.holytemples.org/assets/NOMNI/';
async function read(path,contentType){
 const uri=root+path;
 const response=await fetch(uri,{
  redirect:'manual',
  signal:AbortSignal.timeout(20000),
  headers:{accept:contentType==='image/jpeg'?'image/jpeg':'application/json'}
 });
 assert.equal(response.status,200,`Unexpected ${response.status} from ${uri}; no redirects allowed`);
 assert.equal(response.headers.get('location'),null,`Unexpected redirect at ${uri}`);
 assert.match(response.headers.get('content-type')??'',contentType==='image/jpeg'?/^image\/jpeg/i:/^application\/json/i,`Invalid Content-Type at ${uri}`);
 return response;
}
const metadata=await (await read('tokenscan.json','application/json')).json();
assert.equal(metadata.asset,'NOMNI');
assert.equal(metadata.name,'NOMNI');
const info=await (await read('info.json','application/json')).json();
assert.deepEqual(info,metadata);
const bill=await (await read('bill-1.json','application/json')).json();
assert.equal(bill.token.asset_id,'6195210');
const image=Buffer.from(await (await read('nomni-bill-1.jpg','image/jpeg')).arrayBuffer());
assert.equal(image.length,bill.size_bytes);
const hash=createHash('sha256').update(image).digest('hex');
assert.equal(hash,bill.sha256);
assert.equal(hash,metadata.denominations[0].artwork_sha256);
console.log(JSON.stringify({canonical:root,source:'independent HTTPS',metadata:'HTTP 200 JSON no redirects',asset:metadata.asset,artworkBytes:image.length,sha256:hash}));
