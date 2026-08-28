const CP='https://api.counterparty.io:4000';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n):'—';
const status=msg=>{$('marketStatus').textContent=msg};

async function getJson(path){const r=await fetch(`${CP}${path}`);const j=await r.json();if(!r.ok)throw new Error(j?.error||j?.message||`Counterparty API ${r.status}`);return j?.result??j}
async function assetMeta(asset){try{const r=await getJson(`/v2/assets/${encodeURIComponent(asset)}`);const x=Array.isArray(r)?r[0]:r;return {divisible:Boolean(x?.divisible)}}catch{return {divisible:true}}}
const q=(raw,divisible)=>Number(raw||0)/(divisible?1e8:1);

function renderTable(el,rows,columns){if(!rows.length){el.innerHTML='<div class="empty">No matching on-chain records returned.</div>';return}el.innerHTML=`<table><thead><tr>${columns.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(c=>`<td>${esc(c.value(row))}</td>`).join('')}</tr>`).join('')}</tbody></table>`}

async function load(){const base=$('baseAsset').value.trim().toUpperCase(),quote=$('quoteAsset').value.trim().toUpperCase();if(base===quote){status('Choose two different assets.');return}status(`Loading ${base}/${quote} from Counterparty…`);$('bestBid').textContent=$('bestAsk').textContent=$('spread').textContent='—';
 try{
  const [baseMeta,quoteMeta,bidsRaw,asksRaw,matchesRaw]=await Promise.all([
   assetMeta(base),assetMeta(quote),
   getJson(`/v2/orders?status=open&give_asset=${encodeURIComponent(quote)}&get_asset=${encodeURIComponent(base)}&limit=200`),
   getJson(`/v2/orders?status=open&give_asset=${encodeURIComponent(base)}&get_asset=${encodeURIComponent(quote)}&limit=200`),
   getJson('/v2/order_matches?status=completed&limit=200').catch(()=>[])
  ]);
  const list=x=>Array.isArray(x)?x:(Array.isArray(x?.result)?x.result:[]);
  const bidRows=list(bidsRaw).map(o=>{const baseQty=q(o.get_remaining??o.get_quantity,baseMeta.divisible),quoteQty=q(o.give_remaining??o.give_quantity,quoteMeta.divisible);return {...o,baseQty,quoteQty,price:baseQty>0?quoteQty/baseQty:NaN}}).filter(x=>x.baseQty>0&&x.quoteQty>0).sort((a,b)=>b.price-a.price);
  const askRows=list(asksRaw).map(o=>{const baseQty=q(o.give_remaining??o.give_quantity,baseMeta.divisible),quoteQty=q(o.get_remaining??o.get_quantity,quoteMeta.divisible);return {...o,baseQty,quoteQty,price:baseQty>0?quoteQty/baseQty:NaN}}).filter(x=>x.baseQty>0&&x.quoteQty>0).sort((a,b)=>a.price-b.price);
  const bestBid=bidRows[0]?.price,bestAsk=askRows[0]?.price;$('bestBid').textContent=fmt(bestBid);$('bestAsk').textContent=fmt(bestAsk);$('spread').textContent=Number.isFinite(bestBid)&&Number.isFinite(bestAsk)?fmt(bestAsk-bestBid):'—';
  const cols=[{label:'Price',value:r=>fmt(r.price)},{label:base,value:r=>fmt(r.baseQty)},{label:quote,value:r=>fmt(r.quoteQty)}];renderTable($('bidBook'),bidRows.slice(0,40),cols);renderTable($('askBook'),askRows.slice(0,40),cols);
  const matches=list(matchesRaw).filter(m=>{const a=String(m.forward_asset||m.tx0_asset||'').toUpperCase(),b=String(m.backward_asset||m.tx1_asset||'').toUpperCase();return (a===base&&b===quote)||(a===quote&&b===base)}).slice(0,50);
  renderTable($('tradeHistory'),matches,[{label:'Block',value:r=>r.block_index??r.tx0_block_index??'—'},{label:'Forward',value:r=>`${r.forward_quantity??'—'} ${r.forward_asset??''}`},{label:'Backward',value:r=>`${r.backward_quantity??'—'} ${r.backward_asset??''}`},{label:'Status',value:r=>r.status??'completed'}]);
  status(`Live read completed: ${bidRows.length} bids, ${askRows.length} asks, ${matches.length} recent matching trades. No signing or broadcast occurs on this page.`)
 }catch(e){status(`Market data unavailable: ${e.message||e}`);$('bidBook').innerHTML=$('askBook').innerHTML=$('tradeHistory').innerHTML='<div class="empty">Unable to load Counterparty market data.</div>'}
}

document.addEventListener('DOMContentLoaded',()=>{$('refreshMarket').addEventListener('click',load);$('baseAsset').addEventListener('change',load);$('quoteAsset').addEventListener('change',load);load()});
