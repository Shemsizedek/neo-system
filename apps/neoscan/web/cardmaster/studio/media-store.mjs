import {mediaMetadata,mediaRecord,sniffRasterMime,MEDIA_MAX_INPUT_BYTES,MEDIA_MAX_IMAGE_SIDE,MEDIA_MAX_PNG_BYTES,MEDIA_MAX_ITEMS,MEDIA_MAX_TOTAL_BYTES} from './media-core.mjs';
const DB_NAME='neo-crown-media-staging-v1';
const STORE='media';
const readRequest=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('media_store_error'));});
async function openDb(){
  if(!globalThis.indexedDB)return null;
  try{
    return await new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('media_db_open_failed'));
      req.onblocked=()=>reject(new Error('media_db_blocked'));
    });
  } catch{return null;}
}
async function shaBlob(blob){
  if(!globalThis.crypto?.subtle)throw new Error('secure_context_required');
  const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
function toPng(canvas){return new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('image_encoding_failed')),'image/png'));}
export async function normalizeRasterImage(file){
  if(!(file instanceof Blob)||file.size<16||file.size>MEDIA_MAX_INPUT_BYTES)throw new Error('image_too_large_or_empty');
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer()),actual=sniffRasterMime(bytes);
  if(file.type&&file.type!==actual)throw new Error('mime_does_not_match_image_bytes');
  if(!globalThis.createImageBitmap)throw new Error('browser_image_decoder_unavailable');
  let image;
  try{image=await createImageBitmap(file);}catch{throw new Error('malformed_image');}
  try{
    if(!Number.isSafeInteger(image.width)||!Number.isSafeInteger(image.height)||image.width<32||image.height<32||image.width>12000||image.height>12000||image.width*image.height>60000000)throw new Error('unsafe_image_dimensions');
    const scale=Math.min(1,MEDIA_MAX_IMAGE_SIDE/Math.max(image.width,image.height));
    const width=Math.max(32,Math.round(image.width*scale));const height=Math.max(32,Math.round(image.height*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('canvas_unavailable');
    ctx.drawImage(image,0,0,width,height);
    const png=await toPng(canvas);
    if(png.type!=='image/png'||png.size>MEDIA_MAX_PNG_BYTES)throw new Error('normalized_image_exceeds_4mb');
    return {blob:png,sha256:await shaBlob(png),width,height};
  }finally{image.close?.();}
}
export function createMediaStore(){
  const memory=new Map();
  const dbPromise=openDb();
  async function list(){
    const db=await dbPromise;
    const items=db?await readRequest(db.transaction(STORE,'readonly').objectStore(STORE).getAll()):[...memory.values()];
    return items.map(item=>item.record).sort((a,b)=>b.created_at_client_clock.localeCompare(a.created_at_client_clock));
  }
  async function get(id){
    if(typeof id!=='string'||!/^NEO-MEDIA-[A-F0-9]{24}$/.test(id))return null;
    const db=await dbPromise;
    const item=db?await readRequest(db.transaction(STORE,'readonly').objectStore(STORE).get(id)):memory.get(id);
    if(!item)return null;
    const {record,blob}=item;
    if(!(blob instanceof Blob)||record?.schema!=='neo.crown.media.v1'||record.id!==id||blob.type!=='image/png'||blob.size!==record.size_bytes)throw new Error('stored_image_integrity_error');
    if(await shaBlob(blob)!==record.sha256)throw new Error('stored_image_digest_mismatch');
    return {record,blob};
  }
  async function put(record,blob){
    if(!record||record.schema!=='neo.crown.media.v1'||!(blob instanceof Blob)||blob.type!=='image/png'||blob.size!==record.size_bytes||await shaBlob(blob)!==record.sha256)throw new Error('invalid_image_record');
    const all=await list();
    if(all.some(entry=>entry.id===record.id))throw new Error('image_already_imported');
    if(all.length>=MEDIA_MAX_ITEMS||all.reduce((total,item)=>total+item.size_bytes,0)+record.size_bytes>MEDIA_MAX_TOTAL_BYTES)throw new Error('local_media_quota_reached');
    const db=await dbPromise;
    if(db){await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({id:record.id,record,blob});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('image_store_failed'));tx.onabort=()=>reject(tx.error||new Error('image_store_aborted'));});}
    else memory.set(record.id,{id:record.id,record,blob});
    return record;
  }
  async function remove(id){
    if(!/^NEO-MEDIA-[A-F0-9]{24}$/.test(String(id)))throw new Error('invalid_media_id');
    const db=await dbPromise;
    if(db)await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('image_delete_failed'));});
    else memory.delete(id);
  }
  async function persistent(){return Boolean(await dbPromise);}
  return {list,get,put,remove,persistent};
}
export async function importImage(file,metadata,store){
  mediaMetadata(metadata);
  const normalized=await normalizeRasterImage(file);
  const record=mediaRecord({...metadata,rightsConfirmed:true},{sha256:normalized.sha256,size:normalized.blob.size,width:normalized.width,height:normalized.height,createdAt:new Date().toISOString()});
  await store.put(record,normalized.blob);
  return record;
}
export async function pngDataUrl(blob){
  if(!(blob instanceof Blob)||blob.type!=='image/png'||blob.size>MEDIA_MAX_PNG_BYTES)throw new Error('invalid_png_blob');
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>typeof reader.result==='string'&&reader.result.startsWith('data:image/png;base64,')?resolve(reader.result):reject(new Error('unsafe_image_encoding'));
    reader.onerror=()=>reject(reader.error||new Error('image_read_failed'));
    reader.readAsDataURL(blob);
  });
}
