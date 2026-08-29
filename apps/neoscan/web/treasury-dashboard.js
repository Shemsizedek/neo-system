(()=>{
  const TREASURY='18FyntJG9hdXYvanm67mGgbyo1P7adckvg';
  const CFG=window.NEO_SCAN_CONFIG||{};
  const BASE=String(CFG.statementsSnapshotBase||'../api/neoscan/statements').replace(/\/$/,'');
  const PRIORITY=['NOMNI','NEOCASH','XCP','WORLDCREDIT','NOMNICASH','TALANTON','FREEDOMBOND','DOLLARCASH'];
  const $=id=>document.getElementById(id);
  const html=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const number=v=>{
    const n=Number(v);
    if(!Number.isFinite(n))return String(v??'—');
    return new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n);
  };
  async function read(url){
    const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(Number(CFG.statementsServiceTimeoutMs||8000))});
    if(!r.ok)throw new Error(`snapshot-${r.status}`);
    return r.json();
  }
  function balanceOf(entries,unit){return entries.find(e=>e.unit===unit)?.amount}
  function openSurface(surface,asset){
    const input=$('scanInput');
    if(input)input.value=asset;
    location.hash=`#${surface}`;
    queueMicrotask(()=>document.getElementById('scanForm')?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  }
  function actions(unit){
    const asset=html(unit);
    return `<span class="holding-actions"><button type="button" data-neoscan-asset="${asset}" data-neoscan-surface="scan">Asset profile</button><button type="button" data-neoscan-asset="${asset}" data-neoscan-surface="market">NEO Market Terminal</button></span>`;
  }
  function bindDrilldowns(){
    document.querySelectorAll('[data-neoscan-asset][data-neoscan-surface]').forEach(button=>{
      button.addEventListener('click',()=>openSurface(button.dataset.neoscanSurface,button.dataset.neoscanAsset));
    });
  }
  function holdingRows(entries){
    const ordered=[...entries].sort((a,b)=>{
      const ai=PRIORITY.indexOf(a.unit),bi=PRIORITY.indexOf(b.unit);
      if(ai!==-1||bi!==-1)return (ai===-1?999:ai)-(bi===-1?999:bi);
      return String(a.unit).localeCompare(String(b.unit));
    });
    return ordered.map(e=>`<div class="holding"><span class="holding-asset">${html(e.unit)}</span><strong>${html(number(e.amount))}</strong>${actions(e.unit)}</div>`).join('');
  }
  async function loadTreasury(){
    if(location.hash!=='#treasury')return;
    document.querySelectorAll('[data-surface]').forEach(a=>a.classList.toggle('active',a.dataset.surface==='treasury'));
    $('surfaceEyebrow').textContent='PUBLIC TREASURY INTELLIGENCE';
    $('surfaceTitle').textContent='NEO Treasury Statement.';
    $('surfaceCopy').textContent='Verified GitHub Actions snapshots of the public NEO Treasury wallet. Native ledger units remain separate; no synthetic market value or cross-ledger total is inferred.';
    $('scanInput').value=TREASURY;
    $('scanInput').placeholder='NEO Treasury wallet';
    $('scanButton').textContent='Refresh Treasury';
    $('quickModes').innerHTML='';
    $('result').innerHTML='<div class="empty">Loading verified treasury snapshot…</div>';
    try{
      const [manifest,envelope]=await Promise.all([read(`${BASE}/index.json`),read(`${BASE}/${TREASURY}.json`)]);
      const s=envelope.data||envelope;
      const sources=s.sources||{};
      const btcEntries=sources.bitcoin?.entries||[];
      const cpEntries=sources.counterparty?.entries||[];
      const btc=balanceOf(btcEntries,'BTC')??0;
      const nomni=balanceOf(cpEntries,'NOMNI');
      const neocash=balanceOf(cpEntries,'NEOCASH');
      const xcp=balanceOf(cpEntries,'XCP');
      const ces=sources.ces?.status||'unavailable';
      const offline=sources.offline?.status||'unavailable';
      const record=manifest.accounts?.find(a=>a.account===TREASURY)||{};
      $('result').innerHTML=`
        <h2>NEO Treasury <span class="tag">GITHUB VERIFIED</span></h2>
        <div class="row"><span>Wallet</span><strong>${html(TREASURY)}</strong></div>
        <div class="row"><span>Snapshot label</span><strong>${html(envelope.label||record.label||'NEO Treasury wallet')}</strong></div>
        <div class="row"><span>Generated</span><strong>${html(s.generatedAt||envelope.generatedAt||manifest.generatedAt||'—')}</strong></div>
        <div class="row"><span>Reconciliation</span><strong>${html(s.reconciliationStatus||'—')}</strong></div>
        <div class="treasury-grid">
          <article class="treasury-card"><span>BITCOIN</span><strong>${html(number(btc))} BTC</strong><small>${html(sources.bitcoin?.status||'unavailable')} · native on-chain balance</small></article>
          <article class="treasury-card treasury-asset-card"><span>NOMNI</span><strong>${html(nomni==null?'Not held':number(nomni))}</strong><small>NEO market native unit</small>${actions('NOMNI')}</article>
          <article class="treasury-card treasury-asset-card"><span>NEOCASH</span><strong>${html(neocash==null?'Not held':number(neocash))}</strong><small>NEO market native unit</small>${actions('NEOCASH')}</article>
          <article class="treasury-card treasury-asset-card"><span>XCP</span><strong>${html(xcp==null?'Not held':number(xcp))}</strong><small>Secondary smart-contract obligation asset</small>${actions('XCP')}</article>
        </div>
        <h2>NEO Market Holdings <span class="tag">${cpEntries.length} ASSETS</span></h2>
        <div class="holding-list">${holdingRows(cpEntries)||'<div class="empty">No NEO market balances returned.</div>'}</div>
        <div class="treasury-note">Bitcoin: ${html(sources.bitcoin?.status||'unavailable')} · NEO Market: ${html(sources.counterparty?.status||'unavailable')} · CES: ${html(ces)} · Offline/off-book: ${html(offline)}. Cross-ledger total: ${s.consolidatedTotal==null?'not computed':'provided by an explicit valuation source'}. NEOscan does not treat token quantities as cash value, collateral value, or consolidated net worth without a separate valuation rate, timestamp, and source.</div>`;
      bindDrilldowns();
    }catch(error){
      $('result').innerHTML=`<div class="empty">Treasury snapshot is not available yet. GitHub Pages may still be publishing the current build. (${html(error.message)})</div>`;
    }
  }
  window.addEventListener('hashchange',loadTreasury);
  document.getElementById('scanForm')?.addEventListener('submit',e=>{
    if(location.hash!=='#treasury')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    loadTreasury();
  },true);
  loadTreasury();
})();
