(()=>{'use strict';
const api='https://api.counterparty.io:4000/v2';
const btc='https://mempool.space/api';
const $=id=>document.getElementById(id);
async function read(url){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),7500);try{const r=await fetch(url,{headers:{accept:'application/json'},signal:ctrl.signal});if(!r.ok)throw Error('Provider HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}}
function line(parent,title,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=title;dd.textContent=value??'Unavailable';parent.append(dt,dd)}
async function lookup(){
const input=$('crownAssetInput'),target=$('crownLiveResult');
const asset=input.value.trim().toUpperCase();target.replaceChildren();
if(!/^[A-Z][A-Z0-9.]{0,31}$/.test(asset)){target.textContent='Enter a valid Counterparty asset name.';return}
target.textContent='Reading independent public providers…';
try{
 const raw=await read(api+'/assets/'+encodeURIComponent(asset));
 const obj=Array.isArray(raw.result)?raw.result[0]:raw.result;
 if(!obj||typeof obj!=='object'||(obj.asset&&obj.asset!==asset))throw Error('Asset identity mismatch');
 const dl=document.createElement('dl');
 line(dl,'Counterparty asset',obj.asset||asset);
 line(dl,'Issuer (source-reported)',obj.issuer||obj.owner||'Unavailable');
 line(dl,'Supply (source-reported)',String(obj.supply_normalized??obj.supply??'Unavailable'));
 line(dl,'Locked',typeof obj.locked==='boolean'?String(obj.locked):'Unavailable');
 let height=Number(obj.block_index),blockHash=null;
 if(Number.isSafeInteger(height)&&height>0){
 try {const h=await read(btc+'/block-height/'+height);
 if(typeof h==='string'&&/^[a-f0-9]{64}$/i.test(h))blockHash=h;
 } catch {/* Bitcoin independent lookup unavailable: retain unknown status */}
 }
 target.replaceChildren();target.append(dl);
 const note=document.createElement('p');note.className='notice small';
 note.textContent=blockHash?'Bitcoin block reference independently located: '+blockHash+'. This does not establish an L3 commitment or financial valuation.':'Bitcoin block anchoring not independently verified for this asset observation.';
 target.append(note);
 const source=document.createElement('a');source.href=api+'/assets/'+encodeURIComponent(asset);source.target='_blank';source.rel='noopener noreferrer';source.textContent='Counterparty source record';target.append(source);
}catch(e){target.textContent='Live provider data unavailable or unverified. No market valuation inferred.'}
}
$('crownLookup').addEventListener('click',lookup);
})();