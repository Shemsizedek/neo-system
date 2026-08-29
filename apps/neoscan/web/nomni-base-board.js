(()=>{
  const API='https://api.counterparty.io:4000/v2';
  const BASE='NOMNI';
  const PRIORITY=['BTC','NEOCASH','XCP'];
  const safe=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
  const fmt=v=>{const x=n(v);return x===null?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(x)};
  const norm=(row,key)=>row?.[`${key}_normalized`]??row?.[key]??null;
  async function read(url){const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(9000)});if(!r.ok)throw new Error(String(r.status));return r.json()}
  async function openOrders(){
    try{return (await read(`${API}/assets/${BASE}/orders?status=open&limit=100`)).result||[]}
    catch{try{return ((await read(`${API}/orders?status=open&limit=200`)).result||[]).filter(x=>x.give_asset===BASE||x.get_asset===BASE)}catch{return []}}
  }
  function quoteOf(row){return row.give_asset===BASE?row.get_asset:row.get_asset===BASE?row.give_asset:null}
  function point(row){
    const quote=quoteOf(row);if(!quote)return null;
    if(row.give_asset===BASE){const base=n(norm(row,'give_remaining')??norm(row,'give_quantity')),q=n(norm(row,'get_remaining')??norm(row,'get_quantity'));if(base===null||q===null||base<=0)return null;return {quote,side:'ASK',price:q/base,baseDepth:base,quoteDepth:q,row}}
    const q=n(norm(row,'give_remaining')??norm(row,'give_quantity')),base=n(norm(row,'get_remaining')??norm(row,'get_quantity'));if(base===null||q===null||base<=0)return null;return {quote,side:'BID',price:q/base,baseDepth:base,quoteDepth:q,row};
  }
  function summarize(rows){
    const map=new Map();
    for(const row of rows){const p=point(row);if(!p)continue;if(!map.has(p.quote))map.set(p.quote,{quote:p.quote,bids:[],asks:[]});map.get(p.quote)[p.side==='BID'?'bids':'asks'].push(p)}
    for(const item of map.values()){
      item.bids.sort((a,b)=>b.price-a.price);item.asks.sort((a,b)=>a.price-b.price);
      item.bestBid=item.bids[0]||null;item.bestAsk=item.asks[0]||null;
      item.bidDepth=item.bids.reduce((s,p)=>s+p.baseDepth,0);item.askDepth=item.asks.reduce((s,p)=>s+p.baseDepth,0);
      if(item.bestBid&&item.bestAsk){item.spread=item.bestAsk.price-item.bestBid.price;item.spreadPct=item.bestAsk.price>0?item.spread/item.bestAsk.price*100:null}else{item.spread=null;item.spreadPct=null}
    }
    const ordered=[...map.values()].sort((a,b)=>{const ai=PRIORITY.indexOf(a.quote),bi=PRIORITY.indexOf(b.quote);if(ai!==-1||bi!==-1)return (ai===-1?999:ai)-(bi===-1?999:bi);return (b.bids.length+b.asks.length)-(a.bids.length+a.asks.length)||a.quote.localeCompare(b.quote)});
    for(const q of PRIORITY)if(!map.has(q))ordered.splice(Math.min(PRIORITY.indexOf(q),ordered.length),0,{quote:q,bids:[],asks:[],bestBid:null,bestAsk:null,bidDepth:0,askDepth:0,spread:null,spreadPct:null});
    return ordered;
  }
  function pairCard(item){
    const secondary=item.quote==='XCP'?' · secondary obligation asset':'';
    return `<button class="base-market-pair" type="button" data-base-quote="${safe(item.quote)}"><span><strong>${BASE}/${safe(item.quote)}</strong><small>${item.bids.length+item.asks.length?`${item.bids.length} bids · ${item.asks.length} asks${secondary}`:`No live orders${secondary}`}</small></span><span class="base-market-prices"><small>Bid</small><strong>${item.bestBid?fmt(item.bestBid.price):'—'}</strong><small>Ask</small><strong>${item.bestAsk?fmt(item.bestAsk.price):'—'}</strong></span></button>`;
  }
  function depth(item){
    if(!item)return '<div class="terminal-empty">Select a NOMNI market pair.</div>';
    const levels=[...item.asks.slice(0,6),...item.bids.slice(0,6)];
    if(!levels.length)return `<div class="terminal-empty">No live ${BASE}/${safe(item.quote)} orders were returned. The pair remains listed as a supported market view, but no price or spread is synthesized.</div>`;
    return `<div class="base-market-depth-head"><span>SIDE</span><span>PRICE ${safe(item.quote)}/${BASE}</span><span>NOMNI DEPTH</span><span>QUOTE DEPTH</span></div>${levels.map(p=>`<div class="base-market-depth-row"><span class="terminal-side ${p.side==='BID'?'bid':'offer'}">${p.side}</span><strong>${fmt(p.price)}</strong><span>${fmt(p.baseDepth)} ${BASE}</span><span>${fmt(p.quoteDepth)} ${safe(item.quote)}</span></div>`).join('')}`;
  }
  function metrics(item){
    return `<div class="base-market-metrics"><article><span>BEST BID</span><strong>${item?.bestBid?fmt(item.bestBid.price):'—'}</strong></article><article><span>BEST ASK</span><strong>${item?.bestAsk?fmt(item.bestAsk.price):'—'}</strong></article><article><span>SPREAD</span><strong>${item?.spread===null||item?.spread===undefined?'—':fmt(item.spread)}</strong></article><article><span>SPREAD %</span><strong>${item?.spreadPct===null||item?.spreadPct===undefined?'—':`${fmt(item.spreadPct)}%`}</strong></article><article><span>BID DEPTH</span><strong>${fmt(item?.bidDepth??0)} NOMNI</strong></article><article><span>ASK DEPTH</span><strong>${fmt(item?.askDepth??0)} NOMNI</strong></article></div>`;
  }
  let cache=null,loading=false;
  async function render(force=false){
    if(location.hash!=='#market')return;
    const root=document.getElementById('result');if(!root||root.querySelector('.nomni-base-board')||loading)return;
    loading=true;
    try{
      const rows=force||!cache?await openOrders():cache.rows;const pairs=summarize(rows);cache={rows,pairs};
      const first=pairs.find(x=>x.bids.length||x.asks.length)||pairs[0];
      const board=document.createElement('section');board.className='nomni-base-board';
      board.innerHTML=`<div class="base-market-title"><div><p>N.O.M.N.I. BASE MARKET BOARD</p><h3>NOMNI Pair Matrix</h3><small>NOMNI is the primary NEO market asset. Quotes are secondary market assets or Bitcoin settlement units.</small></div><button type="button" data-base-refresh>Refresh live pairs</button></div><div class="base-market-layout"><div class="base-market-pairs">${pairs.map(pairCard).join('')}</div><div class="base-market-detail"><div class="base-market-detail-title"><span>SELECTED PAIR</span><strong data-base-selected>${BASE}/${safe(first?.quote||'BTC')}</strong></div><div data-base-metrics>${metrics(first)}</div><div data-base-depth>${depth(first)}</div><div class="treasury-note">Best bid, best ask, spread, and depth are computed only from live open orders returned for NOMNI. Missing sides remain unavailable; no synthetic market is created.</div></div></div>`;
      const head=root.querySelector('.terminal-head');head?head.insertAdjacentElement('afterend',board):root.prepend(board);
      function select(quote){const item=pairs.find(x=>x.quote===quote);if(!item)return;board.querySelector('[data-base-selected]').textContent=`${BASE}/${item.quote}`;board.querySelector('[data-base-metrics]').innerHTML=metrics(item);board.querySelector('[data-base-depth]').innerHTML=depth(item);board.querySelectorAll('[data-base-quote]').forEach(b=>b.classList.toggle('active',b.dataset.baseQuote===quote));}
      board.querySelectorAll('[data-base-quote]').forEach(b=>b.onclick=()=>select(b.dataset.baseQuote));if(first)select(first.quote);
      board.querySelector('[data-base-refresh]').onclick=async()=>{cache=null;board.remove();loading=false;await render(true)};
    }catch{ /* terminal remains usable when base-board data is unavailable */ }
    finally{loading=false}
  }
  const observer=new MutationObserver(()=>queueMicrotask(()=>render(false)));window.addEventListener('DOMContentLoaded',()=>{observer.observe(document.getElementById('result')||document.body,{childList:true,subtree:true});render(false)});window.addEventListener('hashchange',()=>queueMicrotask(()=>render(false)));
})();
