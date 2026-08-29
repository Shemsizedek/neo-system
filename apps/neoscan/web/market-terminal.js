(()=>{
  const $=id=>document.getElementById(id);
  const isMarket=()=>location.hash==='#market'||location.hash==='#ledger';
  function renderMarketShell(){
    if(!isMarket())return;
    if(location.hash==='#ledger')history.replaceState(null,'','#market');
    document.querySelectorAll('[data-surface]').forEach(a=>a.classList.toggle('active',a.dataset.surface==='market'));
    $('surfaceEyebrow').textContent='N.O.M.N.I. MARKET INTELLIGENCE';
    $('surfaceTitle').textContent='NEO Market Terminal.';
    $('surfaceCopy').textContent='NOMNI is the primary NEO market asset. Inspect secondary NEO assets, live orders, completed matches, and Bitcoin settlement provenance without changing the underlying protocol contracts.';
    $('scanInput').placeholder='NOMNI, NEOCASH, or secondary NEO asset';
    $('scanButton').textContent='Open Market';
    $('quickModes').innerHTML='<button type="button" data-market-asset="NOMNI">NOMNI</button><button type="button" data-market-asset="NEOCASH">NEOCASH</button>';
    document.querySelectorAll('[data-market-asset]').forEach(button=>button.onclick=()=>{
      $('scanInput').value=button.dataset.marketAsset;
      scanLedger(button.dataset.marketAsset);
    });
    if(!$('scanInput').value.trim())$('scanInput').value='NOMNI';
  }
  window.addEventListener('hashchange',()=>queueMicrotask(renderMarketShell));
  document.getElementById('scanForm')?.addEventListener('submit',event=>{
    if(!isMarket())return;
    event.preventDefault();
    event.stopImmediatePropagation();
    scanLedger($('scanInput').value.trim()||'NOMNI');
  },true);
  window.addEventListener('DOMContentLoaded',()=>{
    renderMarketShell();
    if(location.hash==='#market')scanLedger($('scanInput').value.trim()||'NOMNI');
  });
})();
