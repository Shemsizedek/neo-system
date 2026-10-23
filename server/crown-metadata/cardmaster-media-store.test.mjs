import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaStore,normalizeRasterImage,importImage} from '../../apps/neoscan/web/cardmaster/studio/media-store.mjs';
import {MEDIA_MAX_INPUT_BYTES} from '../../apps/neoscan/web/cardmaster/studio/media-core.mjs';
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const source=new Blob([bytes],{type:'image/png'});
const meta={title:'Test artwork',provider:'chatgpt',creator:'Test user',rights:'created',rightsConfirmed:true};

test('browser image decoder normalizes file and verifies SHA-256 in an in-memory local store',async()=>{
  const originalDoc=globalThis.document,originalDecoder=globalThis.createImageBitmap;
  let closed=0;
  globalThis.document={createElement(name){assert.equal(name,'canvas');return {width:0,height:0,getContext(){return {drawImage(){}};},toBlob(cb,type){assert.equal(type,'image/png');cb(new Blob([bytes],{type:'image/png'}));}};}};
  globalThis.createImageBitmap=async()=>({width:500,height:500,close(){closed++;}});
  try{
    const normalized=await normalizeRasterImage(source);
    assert.equal(normalized.width,500);assert.equal(normalized.height,500);
    assert.equal(normalized.blob.type,'image/png');assert.equal(normalized.sha256.length,64);
    assert.equal(closed,1);
    const store=createMediaStore();assert.equal(await store.persistent(),false);
    const record=await importImage(source,meta,store);
    assert.equal(record.provider,'chatgpt');assert.equal(record.rights_independently_verified,false);
    assert.equal((await store.list()).length,1);
    assert.equal((await store.get(record.id)).record.sha256,record.sha256);
    await assert.rejects(importImage(source,meta,store),/already_imported/);
    await store.remove(record.id);
    assert.equal((await store.list()).length,0);
  }finally{globalThis.document=originalDoc;globalThis.createImageBitmap=originalDecoder;}
});
test('malicious payloads and oversize inputs do not reach raster decoder',async()=>{
  let called=0;const originalDecoder=globalThis.createImageBitmap;
  globalThis.createImageBitmap=async()=>{called++;throw Error('should not decode');};
  try{
    await assert.rejects(normalizeRasterImage(new Blob(['<svg onload="alert(1)"></svg>'],{type:'image/svg+xml'})),/unsupported_image_type/);
    await assert.rejects(normalizeRasterImage(new Blob([new Uint8Array(MEDIA_MAX_INPUT_BYTES+1)],{type:'image/png'})),/image_too_large_or_empty/);
    await assert.rejects(normalizeRasterImage(new Blob([bytes],{type:'image/jpeg'})),/mime_does_not_match/);
    assert.equal(called,0);
  }finally{globalThis.createImageBitmap=originalDecoder;}
});
