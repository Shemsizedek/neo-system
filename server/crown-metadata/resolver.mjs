import https from 'node:https';
import {resolve4} from 'node:dns/promises';
import {sha256} from './integrity.mjs';
export function publicIpv4(ip){const a=ip.split('.').map(Number);if(a.length!==4||a.some(x=>!Number.isInteger(x)||x<0||x>255))return false;const [x,y,z]=a;return !(x===0||x===10||x===127||x>=224||(x===100&&y>=64&&y<=127)||(x===169&&y===254)||(x===172&&y>=16&&y<=31)||(x===192&&(y===168||y===0||y===2))||(x===198&&(y===18||y===19||(y===51&&z===100)))||(x===203&&y===0&&z===113));}
/** DNS checked and pinned for every redirect; metadata only, never arbitrary media downloads. */
export async function getPublicJson(url,{redirects=3}={}){
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port)throw new Error('public_https_required');
 const addresses=await resolve4(u.hostname);if(!addresses.length||addresses.some(ip=>!publicIpv4(ip)))throw new Error('private_address_blocked');
 const response=await new Promise((resolve,reject)=>{const req=https.get(u,{headers:{accept:'application/json','user-agent':'NEO-Crown-Metadata/1'},lookup:(_host,opts,cb)=>cb(null,opts?.all?[{address:addresses[0],family:4}]:addresses[0],4)},res=>{if([301,302,303,307,308].includes(res.statusCode)){res.resume();return resolve({redirect:res.headers.location});}if(res.statusCode!==200){res.resume();return reject(new Error(`metadata_http_${res.statusCode}`));}let size=0;const chunks=[];res.on('data',chunk=>{size+=chunk.length;if(size>262144){res.destroy();reject(new Error('metadata_too_large'));}else chunks.push(chunk);});res.on('end',()=>resolve({bytes:Buffer.concat(chunks),url:u.href}));res.on('error',reject);});const deadline=setTimeout(()=>req.destroy(new Error('metadata_deadline')),10000);req.once('close',()=>clearTimeout(deadline));req.setTimeout(7000,()=>req.destroy(new Error('metadata_timeout')));req.on('error',reject);});
 if(response.redirect){if(!redirects)throw new Error('too_many_redirects');return getPublicJson(new URL(response.redirect,u).href,{redirects:redirects-1});}
 const json=JSON.parse(response.bytes.toString('utf8'));if(!json||typeof json!=='object'||Array.isArray(json))throw new Error('invalid_metadata_object');return {...response,json};
}
const link=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
export function normalizeMedia(meta){
 const items=[];const add=(kind,url,title)=>{const safe=link(url);if(safe&&!items.some(x=>x.kind===kind&&x.url===safe))items.push({kind,url:safe,title:String(title||kind).slice(0,255)});};
 add('image',meta.image,meta.image_title||meta.name);add('image',meta.image_large,'Large artwork');add('website',meta.website,'Website');add('file',meta.animation_url,'Animation / media');
 for(const [field,kind] of [['images','image'],['audio','audio'],['video','video'],['files','file']])for(const item of Array.isArray(meta[field])?meta[field]:[])if(item&&typeof item==='object')add(kind,item.data||item.url,item.name);
 return {items:items.slice(0,100),html:typeof meta.html==='string'?meta.html.slice(0,10000):null};
}
export function metadataPointer(description){
 let value=String(description||'').trim(),expectedHash=null;
 const match=value.match(/^(.*);([a-fA-F0-9]{64})$/);if(match){value=match[1];expectedHash=match[2].toLowerCase();}
 if(/^ipfs:/i.test(value))value='https://ipfs.io/ipfs/'+value.replace(/^ipfs:(\/\/)?/i,'').replace(/^ipfs\//,'');
 if(!value.startsWith('https://')&&/^[a-z0-9.-]+\//i.test(value))value='https://'+value;
 if(!value.startsWith('https://'))return null;
 return {url:value,expectedHash};
}
export function createAssetResolver({fetchLedger=async asset=>{const r=await fetch('https://api.counterparty.io:4000/v2/assets/'+encodeURIComponent(asset),{signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('ledger_unavailable');const raw=await r.text();return JSON.parse(raw.replace(/("supply"\s*:\s*)(\d+)/,'$1"$2"')).result;},fetchMetadata=getPublicJson}={}){
 const cache=new Map(),pending=new Map();
 const run=async asset=>{
  const ledger=await fetchLedger(asset);if(!ledger?.asset)throw new Error('asset_not_found');
  const pointer=metadataPointer(ledger.description),result={schema:'NEO-CROWN-RESOLVED-ASSET-V1',requested_asset:asset,canonical_asset:ledger.asset,asset_longname:ledger.asset_longname||null,ledger,observed_at:new Date().toISOString(),metadata_status:'NO_POINTER',metadata:null,media:{items:[],html:null},blockchain_anchor_verified:false};
  if(pointer)try{const source=await fetchMetadata(pointer.url);if(source.json.asset!==ledger.asset&&source.json.asset!==ledger.asset_longname)throw new Error('metadata_asset_mismatch');const hash=sha256(source.bytes);if(pointer.expectedHash&&hash!==pointer.expectedHash)throw new Error('metadata_hash_mismatch');Object.assign(result,{metadata_status:'RESOLVED',metadata:source.json,media:normalizeMedia(source.json),metadata_url:source.url,metadata_sha256:hash,description_hash_verified:!!pointer.expectedHash});}catch(error){result.metadata_status='UNAVAILABLE';result.error=error.message;}
  if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(asset,{until:Date.now()+60000,value:result});return result;
 };
 return async asset=>{if(!/^[A-Za-z0-9_.-]{1,255}$/.test(asset))throw new Error('invalid_asset');const c=cache.get(asset);if(c&&c.until>Date.now())return c.value;if(pending.has(asset))return pending.get(asset);if(pending.size>=8)throw new Error('resolver_busy');const p=run(asset).finally(()=>pending.delete(asset));pending.set(asset,p);return p;};
}
const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderResolvedAsset(r,crownRecord){
 const title=r.asset_longname||r.canonical_asset;const media=r.media.items;
 const render=i=>{const u=esc(i.url),t=esc(i.title);return `<article><h3>${t}</h3>${i.kind==='image'?`<img loading="lazy" referrerpolicy="no-referrer" src="${u}" alt="${t}">`:i.kind==='audio'?`<audio controls preload="none" src="${u}"></audio>`:i.kind==='video'?`<video controls preload="none" src="${u}"></video>`:i.kind==='website'||i.kind==='file'?`<iframe loading="lazy" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${u}" title="${t}"></iframe>`:''}<p><a href="${u}" target="_blank" rel="noopener noreferrer">Open ${esc(i.kind)}</a></p></article>`;};
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · NEO Scan / Crown</title><style>body{font:16px system-ui;background:#101517;color:#eee2c7;margin:0}main{max-width:1000px;margin:auto;padding:24px}a{color:#dfbd68}input,button{padding:12px;font:inherit}img,video,iframe{max-width:100%;width:100%;max-height:650px;object-fit:contain}article{border:1px solid #776747;padding:16px;margin:18px 0}small{overflow-wrap:anywhere}iframe{height:480px;border:1px solid #776747}</style><main><form method="GET" action="/assets/explore"><label>Counterparty asset <input name="asset" value="${esc(title)}" required maxlength="255"></label><button>Explore</button></form><h1>${esc(title)}</h1><p>Canonical asset: ${esc(r.canonical_asset)} · Metadata: ${esc(r.metadata_status)}</p><p>${esc(r.metadata?.description||r.ledger.description)}</p><small>Owner: ${esc(r.ledger.owner)} · Supply in raw units: ${esc(r.ledger.supply)} · Locked: ${esc(String(r.ledger.locked))}</small>${media.map(render).join('')}${r.media.html?`<h2>Issuer additional information</h2><iframe sandbox="" referrerpolicy="no-referrer" srcdoc="${esc(r.media.html)}" title="Issuer HTML in restricted frame"></iframe>`:''}${crownRecord?`<h2>Crown information</h2><p>Hosted Crown enrichment. On-chain description linkage must be checked separately.</p><a href="/assets/${encodeURIComponent(crownRecord.manifest.ledger.asset)}/index.html">Open Crown card and attachments</a>`:''}<p>${esc(r.error||'')}</p><p><a href="resolve.json">Resolved metadata JSON</a> · <a target="_blank" rel="noopener noreferrer" href="https://tokenscan.io/asset/${encodeURIComponent(title)}">TokenScan</a></p><p>PDFs, applications and external websites open at their source. Issuer HTML is isolated; external sites may prohibit embedding.</p></main></html>`;
}
