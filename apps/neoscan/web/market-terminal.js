(()=>{
  const BTC_API='https://mempool.space/api';
  const MARKET_API='https://api.counterparty.io:4000/v2';
  const TREASURY='18FyntJG9hdXYvanm67mGgbyo1P7adckvg';
  const SNAPSHOT_BASE='../api/neoscan/statements';
  const $=id=>document.getElementById(id);
  const isMarket=()=>location.hash==='#market'||location.hash==='#ledger';
  const safe=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const amount=v=>{
    const n=Number(v);
    return Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n):String(v??'—');
  };
  async function read(url){
    const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(9000)});
    if(!response.ok)throw new Error(`${response.status}`);
    return response.json();
  }
  const normalized=(row,key)=>row?.[`${key}_normalized`]??row?.[key]??'—';
  function marketPrice(row,asset){
    const give=row.give_asset,get=row.get_asset,g=Number(normalized(row,'give_quantity')),r=Number(normalized(row,'get_quantity'));
    if(!Number.isFinite(g)||!Number.isFinite(r)||g<=0||r<=0)return '—';
    if(give===asset)return `${(r/g).toPrecision(8)} ${get}/${asset}`;
    if(get===asset)return `${(g/r).toPrecision(8)} ${give}/${asset}`;
    return '—';
  }
  async function orders(asset){
    try{return (await read(`${MARKET_API}/assets/${encodeURIComponent(asset)}/orders?status=open&limit=30`)).result||[]}
    catch{try{return ((await read(`${MARKET_API}/orders?status=open&limit=100`)).result||[]).filter(x=>x.give_asset===asset||x.get_asset===asset).slice(0,30)}catch{return []}}
  }
  async function matches(asset){
    try{return (await read(`${MARKET_API}/assets/${encodeURIComponent(asset)}/order_matches?status=completed&limit=30`)).result||[]}
    catch{try{return ((await read(`${MARKET_API}/order_matches?status=completed&limit=100`)).result||[]).filter(x=>x.forward_asset===asset||x.backward_asset===asset||x.give_asset===asset||x.get_asset===asset).slice(0,30)}catch{return []}}
  }
  async function holders(asset){
    const urls=[`${MARKET_API}/assets/${encodeURIComponent(asset)}/balances?limit=100`,`${MARKET_API}/assets/${encodeURIComponent(asset)}/holders?limit=100`];
    for(const url of urls){try{const d=await read(url);const rows=d.result||d;if(Array.isArray(rows))return rows}catch{}}
    return [];
  }
  async function issuances(asset){
    const urls=[`${MARKET_API}/assets/${encodeURIComponent(asset)}/issuances?limit=20`,`${MARKET_API}/issuances?asset=${encodeURIComponent(asset)}&limit=20`];
    for(const url of urls){try{const d=await read(url);const rows=d.result||d;if(Array.isArray(rows))return rows}catch{}}
    return [];
  }
  async function treasuryPosition(asset){
    try{
      const envelope=await read(`${SNAPSHOT_BASE}/${TREASURY}.json`),statement=envelope.data||envelope;
      const entries=statement.sources?.counterparty?.entries||[];
      const found=entries.find(row=>row.unit===asset);
      return {status:'verified snapshot',amount:found?.amount??null,generatedAt:statement.generatedAt||envelope.generatedAt||'—'};
    }catch{return {status:'snapshot unavailable',amount:null,generatedAt:'—'}}
  }
  function pairSummary(openOrders,asset){
    const map=new Map();
    for(const row of openOrders){const other=row.give_asset===asset?row.get_asset:row.get_asset===asset?row.give_asset:null;if(!other)continue;map.set(other,(map.get(other)||0)+1)}
    return [...map.entries()].sort((a,b)=>b[1]-a[1]);
  }
  function depthRows(openOrders,asset){
    if(!openOrders.length)return '<div class="terminal-empty">No live open orders returned for this asset.</div>';
    return openOrders.slice(0,16).map(row=>{
      const side=row.give_asset===asset?'OFFER':'BID';
      const pair=row.give_asset===asset?`${asset}/${row.get_asset}`:`${asset}/${row.give_asset}`;
      return `<div class="terminal-table-row"><span class="terminal-side ${side==='BID'?'bid':'offer'}">${side}</span><span>${safe(pair)}</span><strong>${safe(marketPrice(row,asset))}</strong><span>${safe(amount(normalized(row,'give_remaining')))}</span></div>`;
    }).join('');
  }
  function tradeRows(rows,asset){
    if(!rows.length)return '<div class="terminal-empty">No completed matches were returned by the live market data service.</div>';
    return rows.slice(0,12).map(row=>{
      const a=row.forward_asset||row.give_asset||asset,b=row.backward_asset||row.get_asset||'—';
      return `<div class="terminal-table-row trade"><span>${safe(a)} ↔ ${safe(b)}</span><strong>${safe(amount(normalized(row,'forward_quantity')))}</strong><span>${safe(amount(normalized(row,'backward_quantity')))}</span><span>${safe(row.status||'completed')}</span></div>`;
    }).join('');
  }
  function issuanceRows(rows){
    if(!rows.length)return '<div class="terminal-empty">No issuance records returned on this endpoint.</div>';
    return rows.slice(0,8).map(row=>`<div class="terminal-mini-row"><span>${safe(row.block_index??row.block_height??'—')}</span><strong>${safe(amount(row.quantity_normalized??row.quantity??'—'))}</strong><span>${safe(row.status||row.locked===true?'locked':'recorded')}</span></div>`).join('');
  }
  function holderRows(rows){
    if(!rows.length)return '<div class="terminal-empty">Holder detail is not available from the current public endpoint.</div>';
    return rows.slice(0,10).map(row=>`<div class="terminal-mini-row"><span>${safe(row.address||row.owner||'holder')}</span><strong>${safe(amount(row.quantity_normalized??row.quantity??row.amount??'—'))}</strong></div>`).join('');
  }
  function role(asset){return asset==='NOMNI'?'PRIMARY NEO ASSET':asset==='XCP'?'SECONDARY OBLIGATION ASSET':'SECONDARY NEO ASSET'}
  function setShell(){
    if(!isMarket())return;
    if(location.hash==='#ledger')history.replaceState(null,'','#market');
    document.querySelectorAll('[data-surface]').forEach(a=>a.classList.toggle('active',a.dataset.surface==='market'));
    $('surfaceEyebrow').textContent='N.O.M.N.I. · PRIMARY NEO MARKET';
    $('surfaceTitle').textContent='NEO Market Terminal.';
    $('surfaceCopy').textContent='NOMNI-first market intelligence with live depth, completed trades, holders, issuance records, Treasury position, and Bitcoin settlement provenance.';
    $('scanInput').placeholder='NOMNI, NEOCASH, or secondary NEO asset';
    $('scanButton').textContent='Open Market';
    $('quickModes').innerHTML='<button type="button" data-market-asset="NOMNI">NOMNI</button><button type="button" data-market-asset="NEOCASH">NEOCASH</button>';
    document.querySelectorAll('[data-market-asset]').forEach(button=>button.onclick=()=>openMarket(button.dataset.marketAsset));
    if(!$('scanInput').value.trim())$('scanInput').value='NOMNI';
  }
  async function openMarket(value){
    if(!isMarket())return;
    const asset=String(value||'NOMNI').trim().toUpperCase()||'NOMNI';
    $('scanInput').value=asset;
    $('result').innerHTML='<div class="empty">Loading live NEO Market Terminal…</div>';
    const [assetR,ordersR,matchesR,holdersR,issuancesR,treasuryR,heightR,feesR]=await Promise.allSettled([
      read(`${MARKET_API}/assets/${encodeURIComponent(asset)}`),orders(asset),matches(asset),holders(asset),issuances(asset),treasuryPosition(asset),read(`${BTC_API}/blocks/tip/height`),read(`${BTC_API}/v1/fees/recommended`)
    ]);
    if(assetR.status!=='fulfilled'){$('result').innerHTML=`<div class="empty">No NEO market record was returned for <strong>${safe(asset)}</strong>.</div>`;return}
    const meta=assetR.value.result||assetR.value;
    const openOrders=ordersR.status==='fulfilled'?ordersR.value:[];
    const completed=matchesR.status==='fulfilled'?matchesR.value:[];
    const holderData=holdersR.status==='fulfilled'?holdersR.value:[];
    const issuanceData=issuancesR.status==='fulfilled'?issuancesR.value:[];
    const treasury=treasuryR.status==='fulfilled'?treasuryR.value:{status:'snapshot unavailable',amount:null,generatedAt:'—'};
    const pairs=pairSummary(openOrders,asset);
    const height=heightR.status==='fulfilled'?heightR.value:'—';
    const fees=feesR.status==='fulfilled'?feesR.value:{};
    const secondary=asset==='XCP';
    $('result').innerHTML=`
      <section class="terminal-head">
        <div><p>N.O.M.N.I. / NEO MARKET TERMINAL</p><h2>${safe(asset)} <span class="tag">${safe(role(asset))}</span></h2><small>${safe(meta.description||'NEO market asset')}</small></div>
        <div class="terminal-head-stats"><article><span>SUPPLY</span><strong>${safe(amount(meta.supply_normalized??meta.supply??'—'))}</strong></article><article><span>OPEN ORDERS</span><strong>${openOrders.length}</strong></article><article><span>RECENT MATCHES</span><strong>${completed.length}</strong></article><article><span>MARKET PAIRS</span><strong>${pairs.length}</strong></article></div>
      </section>
      ${secondary?'<div class="terminal-secondary-notice"><strong>XCP is secondary in the NEO Market.</strong><span>It is presented as Bitcoin-community smart-contract/tokenized-obligation inventory, not as the primary NEO market asset.</span></div>':''}
      <section class="terminal-grid terminal-grid-top">
        <article class="terminal-panel"><h3>Asset Profile</h3><div class="terminal-kv"><span>Primary market</span><strong>N.O.M.N.I.</strong><span>Asset role</span><strong>${safe(role(asset))}</strong><span>Issuer</span><strong>${safe(meta.issuer||meta.owner||'—')}</strong><span>Divisible</span><strong>${meta.divisible===undefined?'—':safe(String(meta.divisible))}</strong><span>Locked</span><strong>${meta.locked===undefined?'—':safe(String(meta.locked))}</strong><span>Settlement base</span><strong>Bitcoin</strong></div></article>
        <article class="terminal-panel"><h3>NEO Treasury Position</h3><div class="terminal-big">${treasury.amount==null?'Not held / unavailable':safe(amount(treasury.amount))}</div><p>${safe(treasury.status)}</p><small>Snapshot: ${safe(treasury.generatedAt)} · Native units only; no synthetic valuation.</small></article>
        <article class="terminal-panel"><h3>Bitcoin Settlement</h3><div class="terminal-big">Block ${safe(height)}</div><p>${safe(fees.halfHourFee??fees.fastestFee??'—')} sat/vB reference fee</p><small>Bitcoin is the settlement and security base. NEOscan does not imply settlement until the relevant Bitcoin transaction is verified.</small></article>
      </section>
      <section class="terminal-grid terminal-grid-market">
        <article class="terminal-panel terminal-wide"><h3>Market Depth <span class="tag">LIVE</span></h3><div class="terminal-table-head"><span>SIDE</span><span>PAIR</span><span>PRICE</span><span>REMAINING</span></div>${depthRows(openOrders,asset)}</article>
        <article class="terminal-panel"><h3>Active NEO Pairs</h3>${pairs.length?pairs.slice(0,12).map(([pair,count])=>`<button class="terminal-pair" type="button" data-terminal-asset="${safe(pair)}"><span>${safe(asset)} / ${safe(pair)}</span><strong>${count} order${count===1?'':'s'}</strong></button>`).join(''):'<div class="terminal-empty">No active pairs returned.</div>'}</article>
      </section>
      <section class="terminal-panel"><h3>Recent Completed Trades <span class="tag">LIVE</span></h3><div class="terminal-table-head trades"><span>PAIR</span><span>FORWARD</span><span>BACKWARD</span><span>STATUS</span></div>${tradeRows(completed,asset)}</section>
      <section class="terminal-grid terminal-grid-bottom">
        <article class="terminal-panel"><h3>Holders</h3>${holderRows(holderData)}</article>
        <article class="terminal-panel"><h3>Issuance History</h3>${issuanceRows(issuanceData)}</article>
        <article class="terminal-panel"><h3>Provenance</h3><div class="terminal-kv"><span>Market identity</span><strong>NEO Market Terminal</strong><span>Primary asset</span><strong>NOMNI</strong><span>Market index</span><strong>N.O.M.N.I.</strong><span>Data mode</span><strong>Read-only public market data</strong><span>Accounting</span><strong>Native units kept separate</strong></div></article>
      </section>
      <div class="treasury-note">Live terminal records are derived from the NEO market data path and Bitcoin public network. Empty panels mean the public endpoint returned no record; NEOscan does not fabricate prices, volume, holders, trades, valuations, or settlement status.</div>`;
    document.querySelectorAll('[data-terminal-asset]').forEach(button=>button.onclick=()=>openMarket(button.dataset.terminalAsset));
  }
  window.NEOMarketTerminal=Object.freeze({open:openMarket});
  window.addEventListener('hashchange',()=>queueMicrotask(()=>{setShell();if(location.hash==='#market')openMarket($('scanInput').value||'NOMNI')}));
  document.getElementById('scanForm')?.addEventListener('submit',event=>{if(!isMarket())return;event.preventDefault();event.stopImmediatePropagation();openMarket($('scanInput').value||'NOMNI')},true);
  window.addEventListener('DOMContentLoaded',()=>{setShell();if(isMarket())openMarket($('scanInput').value||'NOMNI')});
})();
