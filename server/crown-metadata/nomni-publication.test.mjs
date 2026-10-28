import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createMetadataServer} from './server.mjs';
const root=new URL('./attachments/NOMNI/',import.meta.url);
const parse=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));

test('Render publish directory contains the exact on-chain metadata path and matching aliases',async()=>{
  const canonical=await parse('tokenscan.json');
  assert.equal(canonical.asset,'NOMNI');
  assert.ok(canonical.description.length<=2048);
  assert.ok(canonical.website.length<=100);
  assert.deepEqual(await parse('assets/NOMNI/tokenscan.json'),canonical);
  assert.deepEqual(await parse('assets/NOMNI/info.json'),canonical);
  const record=await parse('assets/NOMNI/bill-1.json');
  assert.deepEqual(record,await parse('bill-1.json'));
  assert.equal(record.token.metadata_url,'https://crown.holytemples.org/assets/NOMNI/tokenscan.json');
  assert.equal(record.token.asset_id,'6195210');
  assert.deepEqual(record.denomination,{amount:'1',unit:'NOMNI'});
  const bytes=await readFile(new URL('assets/NOMNI/nomni-bill-1.jpg',root));
  const digest=createHash('sha256').update(bytes).digest('hex');
  assert.equal(bytes.length,record.size_bytes);
  assert.equal(digest,record.sha256);
  assert.equal(canonical.denominations[0].artwork_sha256,digest);
  assert.equal(canonical.image_large,record.url);
  assert.equal(canonical.files[0].data,canonical.denominations[0].record);
  assert.equal(record.blockchain_anchor_verified,false);
});

test('metadata runtime serves the bill and full enhanced JSON without missing-file 503 or field loss',async t=>{
  const server=createMetadataServer({store:{get:async()=>null}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin='http://127.0.0.1:'+server.address().port;
  for(const path of ['tokenscan.json','info.json','bill-1.json','nomni-bill-1.jpg']){
    const response=await fetch(origin+'/assets/NOMNI/'+path,{redirect:'error'});
    assert.equal(response.status,200,path);
    assert.equal(response.headers.get('access-control-allow-origin'),'*');
    if(path.endsWith('.json')){
      assert.match(response.headers.get('content-type'),/application\/json/);
      const json=await response.json();
      if(path!=='bill-1.json')assert.deepEqual(json,await parse('tokenscan.json'));
      else assert.equal(json.denomination.unit,'NOMNI');
    }else assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),(await parse('bill-1.json')).sha256);
  }
});
