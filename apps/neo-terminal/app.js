import {bitcoinTransaction,counterpartyAsset,issuerIssuances,TREASURY_WALLET,ORANGE_CHIP_WALLET,reconcileEvidence} from './gateway.js';
const $=id=>document.getElementById(id);
const wallet='18FyntJG9hdXYvanm67mGgbyo1P7adckvg';
const state={feeds:{},issuances:[],lastTip:null};
const now=()=>new Date().toLocaleTimeString();
const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US'):'—';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const classify=name=>/COIN/i.test(name)?'DIGITAL COINAGE':/CASH/i.test(name)?'DIGITAL FIAT CASH':'WORLD CURRENCY / TREASURY ASSET';
export const normalizeIssuances=(payload,address=wallet)=>{
 const rows=Array.isArray(payload)?payload:Array.isArray(payload?.result)?payload.result:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.result?.issuances)?payload.result.issuances:Array.isArray(payload?.issuances)?payload.issuances:[];
 return rows.filter(r=>String(r.issuer??r.source??r.address??'')===address&&!['invalid','rejected'].includes(String(r.status??'').toLowerCase())).map(r=>({asset:String(r.asset??r.asset_name??''),quantity:r.quantity??r.quantity_normalized??r.supply??'—'})).filter(r=>r.asset);
};
const controllerFetch=async(url,timeout=11000)=>{const controller=new AbortController();const t=setTimeout(()=>controller.abort(),timeout);try{const res=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});if(!res.ok)throw Error('HTTP '+res.status);return await res.json()}finally{clearTimeout(t)}};
function feed(name,status,detail){state.feeds[name]={status,detail,time:now()};$('feeds').innerHTML=Object.entries(state.feeds).map(([name,f])=>'<tr><td>'+escapeHTML(name)+'</td><td class="'+(f.status==='LIVE'?'ok':'bad')+' status">'+escapeHTML(f.status)+'</td><td>'+escapeHTML(f.time+' · '+f.detail)+'</td></tr>').join('');const active=Object.values(state.feeds).filter(x=>x.status==='LIVE').length;$('overall').textContent=active+' / '+Object.keys(state.feeds).length+' FEEDS LIVE';$('overall').className='pill '+(active?'ok':'bad')}
async function refresh(){
 $('refresh').disabled=true;$('refresh').textContent='Refreshing…';
 await Promise.allSettled([
  (async()=>{try{const d=await controllerFetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');const n=Number(d?.bitcoin?.usd);if(!Number.isFinite(n)||n<=0)throw Error('Invalid price');$('btcPrice').textContent='$'+fmt(n);$('btcSource').textContent='CoinGecko · observed '+now()+' · indicative';feed('CoinGecko BTC/USD','LIVE','public quote')}catch(e){$('btcPrice').textContent='Unavailable';$('btcSource').textContent=String(e.message);feed('CoinGecko BTC/USD','UNAVAILABLE',e.message)}})(),
  (async()=>{try{const d=await controllerFetch('https://mempool.space/api/blocks/tip/height');const n=Number(d);if(!Number.isInteger(n)||n<1)throw Error('Invalid tip');state.lastTip=n;$('height').textContent=fmt(n);$('chainSource').textContent='mempool.space · observed '+now();$('tipDetail').textContent='Bitcoin chain height '+fmt(n)+' · source mempool.space';feed('Bitcoin chain tip','LIVE','public network height')}catch(e){$('height').textContent='Unavailable';feed('Bitcoin chain tip','UNAVAILABLE',e.message)}})(),
  (async()=>{try{const d=await controllerFetch('https://api.counterparty.io:4000/v2/addresses/'+wallet+'/issuances?limit=1');if(!d||typeof d!=='object')throw Error('Invalid response');$('xcpStatus').textContent='Reachable';$('xcpSource').textContent='Counterparty v2 · observed '+now();feed('Counterparty v2','LIVE','issuer endpoint')}catch(e){$('xcpStatus').textContent='Unavailable';$('xcpSource').textContent=String(e.message);feed('Counterparty v2','UNAVAILABLE',e.message)}})()
 ]);$('refresh').disabled=false;$('refresh').textContent='Refresh feeds';
}
function renderTreasury(){const q=$('assetSearch').value.trim().toUpperCase();const rows=state.issuances.filter(r=>r.asset.toUpperCase().includes(q));$('treasuryRows').innerHTML=rows.map(r=>'<tr><td>'+escapeHTML(r.asset)+'</td><td>'+escapeHTML(classify(r.asset))+'</td><td>'+escapeHTML(r.quantity)+'</td></tr>').join('');$('treasuryStatus').textContent=state.issuances.length+' issuer-attributed records loaded; '+rows.length+' match filter.'}
async function treasury(){const b=$('treasuryRefresh');b.disabled=true;$('treasuryStatus').textContent='Loading issuer records…';try{let all=[],offset=0;for(let i=0;i<10;i++){const d=await controllerFetch('https://api.counterparty.io:4000/v2/addresses/'+wallet+'/issuances?limit=100&offset='+offset);const page=normalizeIssuances(d);all.push(...page);const raw=d?.result??d?.data??d?.issuances;const count=Array.isArray(raw)?raw.length:Array.isArray(raw?.issuances)?raw.issuances.length:0;if(count<100)break;offset+=100}state.issuances=all;renderTreasury()}catch(e){$('treasuryStatus').textContent='Treasury feed unavailable: '+e.message+'. No cached or fabricated issuance records displayed.'}finally{b.disabled=false}}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab').forEach(s=>s.classList.toggle('hidden',s.id!==b.dataset.tab))}));
$('refresh').addEventListener('click',refresh);$('treasuryRefresh').addEventListener('click',treasury);$('assetSearch').addEventListener('input',renderTreasury);
refresh();

let lastBitcoin=null,lastCounterparty=null;
async function inspectGateway(kind){
 const buttonIds=['verifyTx','verifyAsset','verifyTreasury','verifyOrange'];
 buttonIds.forEach(id=>$(id).disabled=true);
 $('evidenceState').textContent='Inspecting public evidence…';
 try{
  let result;
  if(kind==='tx'){result=await bitcoinTransaction($('txidInput').value.trim());lastBitcoin=result}
  else if(kind==='asset'){result=await counterpartyAsset($('assetInput').value.trim());lastCounterparty=result}
  else if(kind==='treasury')result=await issuerIssuances(TREASURY_WALLET);
  else result=await issuerIssuances(ORANGE_CHIP_WALLET);
  $('evidenceState').textContent='Public API observation received · '+new Date().toLocaleString()+' · NOT an institutional attestation';
  $('evidenceOutput').textContent=JSON.stringify({observation:result,reconciliation:reconcileEvidence({bitcoin:lastBitcoin,counterparty:lastCounterparty})},null,2);
 }catch(e){$('evidenceState').textContent='Evidence unavailable: '+e.message;$('evidenceOutput').textContent='No observation accepted; previous values are not current.'}
 finally{buttonIds.forEach(id=>$(id).disabled=false)}
}
$('verifyTx').addEventListener('click',()=>inspectGateway('tx'));
$('verifyAsset').addEventListener('click',()=>inspectGateway('asset'));
$('verifyTreasury').addEventListener('click',()=>inspectGateway('treasury'));
$('verifyOrange').addEventListener('click',()=>inspectGateway('orange'));

async function loadWorldCurrencyPairs(){
 try{
  const observation=await issuerIssuances(TREASURY_WALLET);
  const names=[...new Set(observation.record.records.map(r=>r.asset).filter(Boolean))].sort();
  for(const name of names){if(![...$('deskBase').options].some(o=>o.value===name))$('deskBase').add(new Option(name,name));if(![...$('deskQuote').options].some(o=>o.value===name))$('deskQuote').add(new Option(name,name))}
  $('deskPair').textContent='Treasury issuance candidates indexed: '+names.length+'. Select a pair to inspect; no executable USD liquidity has been established.';
 }catch(e){$('deskPair').textContent='Treasury issuer feed unavailable: '+e.message+'. NOMNI/USD remains a requested market, not a verified listing.'}
}
$('deskRoute').addEventListener('click',()=>{
 const base=$('deskBase').value,quote=$('deskQuote').value;
 $('deskPair').textContent=base===quote?'Base and quote must differ.':base+'/'+quote+' selected · indicative market discovery only. No executable order book, fiat redemption, or settlement rail certified.';
});
loadWorldCurrencyPairs();
