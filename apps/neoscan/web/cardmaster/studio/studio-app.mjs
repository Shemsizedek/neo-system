import {STUDIO_CARDS,studioConfig,renderStudioSvg,studioManifest,studioPrompt} from './studio-core.mjs';
import {imageAttachmentSvg,attachMediaManifest} from './media-core.mjs';
import {setupMediaUI} from './media-ui.mjs';

const $=id=>document.getElementById(id);
const controls=$('studioControls'),asset=$('asset'),heading=$('heading'),edition=$('edition'),variant=$('variant');
const preview=$('artPreview'),notice=$('renderStatus');
const STORAGE_KEY='neo-crown-studio-local-revisions-v1';
const media=setupMediaUI({notice});
let history=[],active=null,face='front',previewUrl=null,renderSeq=0;

function loadSaved(){
  try {
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    if(!Array.isArray(raw))return [];
    return raw.slice(0,12).filter(item=>{
      try{return item&&item.manifest?.schema==='neo.crown.artwork-studio.v1'&&studioConfig(item.config).revision===item.manifest.artwork_revision&&/^[a-f0-9]{64}$/.test(item.manifest.assets?.front?.sha256)&&/^[a-f0-9]{64}$/.test(item.manifest.assets?.back?.sha256);}catch{return false;}
    });
  } catch{return [];}
}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(history.slice(0,12)));}catch{notice.textContent='Artwork ready. Browser storage unavailable; export your files for a durable copy.';}}
function safeInt(control){return /^\d+$/.test(String(control.value))?Number(control.value):NaN;}
function currentInputs(revision){return studioConfig({card_id:asset.value,title:heading.value,edition:safeInt(edition),variant:safeInt(variant),palette:$('palette').value,template:$('template').value,revision});}
function nextRevision(cardId){return 1+history.filter(x=>x.config.card_id===cardId).reduce((max,x)=>Math.max(max,x.config.revision),0);}
async function digest(text){
  if(!globalThis.crypto?.subtle)throw new Error('Secure HTTPS or localhost is required for hashing.');
  const value=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(value),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function updatePreview(){
  if(!active)return;
  const svg=active.svg[face];
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  const old=previewUrl;previewUrl=url;
  preview.onload=()=>{if(old)URL.revokeObjectURL(old);};
  preview.onerror=()=>{if(old)URL.revokeObjectURL(old);notice.textContent='Preview could not render this vector design.';};
  preview.src=url;
  preview.alt=active.config.title+' — '+face+' side, edition '+active.config.edition;
  $('frontTab').classList.toggle('active',face==='front');$('frontTab').setAttribute('aria-pressed',String(face==='front'));
  $('backTab').classList.toggle('active',face==='back');$('backTab').setAttribute('aria-pressed',String(face==='back'));
}
function historyView(){
  const list=$('revisionList');list.replaceChildren();
  $('archiveCount').textContent=history.length+' stored';
  for(const item of history){
    const li=document.createElement('li'),button=document.createElement('button');button.type='button';
    button.textContent='REV '+String(item.config.revision).padStart(2,'0')+' · '+item.config.title.slice(0,26);
    const info=document.createElement('small');info.textContent=item.config.palette+' / '+item.config.template+' · '+item.manifest.rendered_at_client_clock.slice(0,10);
    button.append(info);
    if(active?.manifest?.assets.front.sha256===item.manifest.assets.front.sha256)button.classList.add('selected');
    button.addEventListener('click',()=>restore(item));li.append(button);list.append(li);
  }
}
function syncForm(config){asset.value=config.card_id;heading.value=config.title;edition.value=config.edition;variant.value=config.variant;$('palette').value=config.palette;$('template').value=config.template;}
function display(record){
  active=record;
  $('recordId').textContent=record.config.card_id;
  $('recordVersion').textContent='v'+record.config.revision+' · edition '+record.config.edition;
  $('recordHash').textContent=record.manifest.assets.front.sha256;
  $('recordBackHash').textContent=record.manifest.assets.back.sha256;
  $('artPrompt').textContent=studioPrompt(record.config);
  $('recordMedia').textContent=record.manifest.media_artwork ? 'User-declared '+record.manifest.media_artwork.provider_user_declared+' · '+record.manifest.media_artwork.media_id.slice(-8) : 'None (vector only)';
  updatePreview();historyView();
}
async function prepare(config,{createdAt=new Date().toISOString(),previousFrontHash=null,mediaId=''}={}){
  // Imported binary remains exclusively in the browser's private media vault.
  let front=renderStudioSvg(config,'front');
  const back=renderStudioSvg(config,'back');
  const imported=await media.mediaFor(mediaId);
  if(imported)front=imageAttachmentSvg(front,imported.dataUri);
  const [frontHash,backHash]=await Promise.all([digest(front),digest(back)]);
  let manifest=studioManifest(config,{frontHash,backHash,createdAt,previousFrontHash});
  if(imported)manifest=attachMediaManifest(manifest,imported.record);
  return {config,manifest,svg:{front,back}};
}
async function generate(){
  const seq=++renderSeq;$('generate').disabled=true;notice.textContent='Rendering vector edition and calculating image digests…';
  try {
    const config=currentInputs(nextRevision(asset.value));
    const previous=active?.config.card_id===config.card_id?active.manifest.assets.front.sha256:null;
    const record=await prepare(config,{previousFrontHash:previous,mediaId:media.selectedId()});
    if(seq!==renderSeq)return;
    history.unshift({config:record.config,manifest:record.manifest});history=history.slice(0,12);persist();
    display(record);
    notice.textContent='Revision '+record.config.revision+' created locally. Export both faces and JSON for durable copies.';
  } catch(error){notice.textContent='Artwork was not generated: '+(error instanceof Error?error.message:'Invalid configuration');}
  finally{if(seq===renderSeq)$('generate').disabled=false;}
}
async function restore(item){
  const seq=++renderSeq;notice.textContent='Validating stored artwork digest…';
  try {
    const cfg=studioConfig(item.config);
    const linkedId=item.manifest.media_artwork?.media_id||'';
    const reconstructed=await prepare(cfg,{createdAt:item.manifest.rendered_at_client_clock,previousFrontHash:item.manifest.parent_front_sha256,mediaId:linkedId});
    if(reconstructed.manifest.assets.front.sha256!==item.manifest.assets.front.sha256||reconstructed.manifest.assets.back.sha256!==item.manifest.assets.back.sha256)throw Error('Local artwork digest mismatch');
    if(seq!==renderSeq)return;
    syncForm(cfg);await media.select(linkedId);display(reconstructed);
    notice.textContent='Opened local revision '+cfg.revision+'. Revalidated both SHA-256 digests.';
    return true;
  }catch(error){notice.textContent='Revision unavailable: '+(error instanceof Error?error.message:'corrupt local data');return false;}
}
function downloadBytes(bytes,filename,type){
  const href=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=href;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1500);
}
function basename(){return active.config.card_id+'-e'+String(active.config.edition).padStart(4,'0')+'-v'+String(active.config.revision).padStart(2,'0');}
function exportSvg(){if(!active)return;downloadBytes(active.svg[face],basename()+'-'+face+'.svg','image/svg+xml');notice.textContent=active.manifest.media_artwork?'Mixed-media SVG downloaded with a locally embedded sanitized image; no independent rights certification.':'SVG downloaded. Off-chain art only; not a token or certificate.';}
async function exportPng(){
  if(!active)return;
  const button=$('downloadPng');button.disabled=true;notice.textContent='Rendering PNG at 1440 × 2080…';
  const url=URL.createObjectURL(new Blob([active.svg[face]],{type:'image/svg+xml'}));
  try{
    const img=new Image();img.src=url;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=2080;
    const context=canvas.getContext('2d');if(!context)throw Error('Canvas not available');
    context.drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG conversion failed')),'image/png'));
    downloadBytes(blob,basename()+'-'+face+'.png','image/png');
    notice.textContent='PNG downloaded at 1440 × 2080. This is locally generated vector-derived artwork.';
  }catch(error){notice.textContent='PNG unavailable in this browser: '+error.message+'; SVG export remains available.';}
  finally{URL.revokeObjectURL(url);button.disabled=false;}
}
function exportManifest(){if(!active)return;downloadBytes(JSON.stringify(active.manifest,null,2)+'\n',basename()+'-manifest.json','application/json');notice.textContent='Unsigned provenance JSON downloaded. Digest alone does not prove asset ownership.';}
async function copyPrompt(){
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(studioPrompt(active.config));notice.textContent='AI-ready prompt copied. No AI service was called or charged.';}
  catch{notice.textContent='Clipboard unavailable. Copy the visible prompt manually.';}
}
async function evidence(){
  const button=$('checkMarket');button.disabled=true;$('marketStatus').textContent='Checking public Counterparty evidence…';$('marketResults').replaceChildren();
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),16000);
  try{
    const resp=await fetch('/api/crown/order-evidence',{signal:abort.signal,credentials:'omit',headers:{accept:'application/json'},cache:'no-store'});
    if(!resp.ok)throw Error('Service returned '+resp.status);
    const payload=await resp.json();
    if(payload.schema!=='neo.crown.counterparty.order-evidence.v1'||!Array.isArray(payload.pairs)||payload.pairs.length!==2||payload.price!==null||payload.market_quote_verified!==false)throw Error('Invalid evidence response');
    $('marketStatus').textContent='Source checked at '+String(payload.checked_at)+'. No market price is established.';
    for(const pair of payload.pairs){
      if(!['NOMNI/XCP','NOMNI/BTC'].includes(pair.pair))continue;
      const row=document.createElement('div');row.className='market-result';const name=document.createElement('strong'),status=document.createElement('span');name.textContent=pair.pair;
      status.textContent=pair.status==='no_open_orders'?'0 open orders returned':pair.status==='open_listings_present'?'Open listings · not executed trades':'Source unavailable';row.append(name,status);$('marketResults').append(row);
    }
  }catch{$('marketStatus').textContent='Market source unavailable or unverified. No price or liquidity claim can be made.';}
  finally{clearTimeout(timer);button.disabled=false;}
}
controls.addEventListener('submit',event=>{event.preventDefault();generate();});
asset.addEventListener('change',()=>{heading.value=STUDIO_CARDS.find(c=>c.id===asset.value)?.name||'';notice.textContent='Asset changed. Generate a new edition to update artwork.';});
$('reseed').addEventListener('click',()=>{variant.value=String(1+Math.floor(Math.random()*9999));generate();});
$('frontTab').addEventListener('click',()=>{face='front';updatePreview();});
$('backTab').addEventListener('click',()=>{face='back';updatePreview();});
$('downloadSvg').addEventListener('click',exportSvg);$('downloadPng').addEventListener('click',exportPng);
$('downloadManifest').addEventListener('click',exportManifest);$('copyPrompt').addEventListener('click',copyPrompt);$('checkMarket').addEventListener('click',evidence);
async function initialize(){
  await media.ready;
  history=loadSaved();
  if(history.length){
    const restored=await restore(history[0]);
    if(!restored){await media.select('');await generate();notice.textContent='A saved revision could not be restored; opened a new procedural-only version. Export stored artwork and reimport any missing images.';}
  }else await generate();
}
initialize();
