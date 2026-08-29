(()=>{
  const BASE='NOMNI';
  const SCRIPT=document.currentScript?.src||location.href;
  const DEFAULT_SNAPSHOT=new URL('../api/markets/tickers.json',SCRIPT).href;
  const number=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const fmt=v=>{const n=number(v);return n===null?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n)};
  async function read(url){const r=await fetch(url,{headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(9000)});if(!r.ok)throw new Error(String(r.status));return r.json()}
  function normalize(data){return (data?.pairs||[]).map(p=>({quote:p.quote,symbol:p.symbol||window.NEOMarketSymbols?.canonical(BASE,p.quote)||`NEO:${BASE}-${p.quote}`,bid:p.bestBid??null,ask:p.bestAsk??null,status:p.status||'UNAVAILABLE',role:p.role||''}))}
  class NeoMarketTape extends HTMLElement{
    connectedCallback(){this.renderLoading();this.refresh();this.timer=setInterval(()=>this.refresh(),60000)}
    disconnectedCallback(){clearInterval(this.timer)}
    snapshotUrl(){return this.getAttribute('snapshot-url')||DEFAULT_SNAPSHOT}
    terminalUrl(quote){const root=this.getAttribute('terminal-root')||'../neoscan/';return `${root}?pair=${encodeURIComponent(`${BASE}/${quote}`)}#market`}
    renderLoading(){this.innerHTML='<div class="neo-tape"><strong>N.O.M.N.I.</strong><span>Loading canonical NEO market feed…</span></div>'}
    async refresh(){let data=null,pairs=[];try{data=await read(this.snapshotUrl());pairs=normalize(data)}catch{}const sourceStatus=data?.sourceStatus||'UNAVAILABLE';this.dispatchEvent(new CustomEvent('neo-market-update',{bubbles:true,detail:{market:'N.O.M.N.I.',primaryAsset:BASE,sourceStatus,generatedAt:data?.generatedAt||null,commit:data?.commit||null,pairs}}));this.innerHTML=`<style>.neo-tape{display:flex;align-items:stretch;gap:8px;overflow:auto;padding:8px;border:1px solid #1d3a28;border-radius:13px;background:#050d08;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.neo-tape>a,.neo-tape>div{min-width:190px;padding:9px 11px;border:1px solid #193323;border-radius:10px;background:#07100b;color:#eafff0;text-decoration:none}.neo-tape .lead{min-width:145px;border-color:#65ff8f}.neo-tape b{display:block;font-size:12px}.neo-tape small{display:block;color:#86a792;margin-top:4px;font-size:10px}.neo-tape .price{display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:11px}.neo-tape .open{color:#65ff8f}.neo-tape .partial{color:#ffd166}.neo-tape .offline{color:#86a792}.neo-tape .symbol{font-size:9px;letter-spacing:.06em}</style><div class="neo-tape"><div class="lead"><b>N.O.M.N.I.</b><small>NOMNI PRIMARY MARKET</small><small>${sourceStatus==='VERIFIED'?'CANONICAL FEED VERIFIED':'FEED UNAVAILABLE'}</small></div>${pairs.length?pairs.map(p=>`<a href="${this.terminalUrl(p.quote)}" title="Open ${BASE}/${p.quote} in NEO Market Terminal"><b>${BASE}/${p.quote}</b><small class="symbol">${p.symbol}</small><small class="${p.status==='OPEN'?'open':p.status==='PARTIAL BOOK'?'partial':'offline'}">${p.status}${p.quote==='XCP'?' · SECONDARY':''}</small><div class="price"><span>Bid ${fmt(p.bid)}</span><span>Ask ${fmt(p.ask)}</span></div></a>`).join(''):'<div><b>NEO MARKET DATA</b><small class="offline">UNAVAILABLE</small><small>No market state was synthesized.</small></div>'}</div>`}
  }
  customElements.define('neo-market-tape',NeoMarketTape);
})();
