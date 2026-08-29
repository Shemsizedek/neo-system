(()=>{
  const symbols=Object.freeze({
    'NOMNI/BTC':Object.freeze({symbol:'NEO:NOMNI-BTC',base:'NOMNI',quote:'BTC',role:'PRIMARY / BITCOIN SETTLEMENT'}),
    'NOMNI/NEOCASH':Object.freeze({symbol:'NEO:NOMNI-NEOCASH',base:'NOMNI',quote:'NEOCASH',role:'PRIMARY / SECONDARY NEO ASSET'}),
    'NOMNI/XCP':Object.freeze({symbol:'NEO:NOMNI-XCP',base:'NOMNI',quote:'XCP',role:'PRIMARY / SECONDARY OBLIGATION ASSET'})
  });
  function canonical(base,quote){const b=String(base||'NOMNI').toUpperCase(),q=String(quote||'').toUpperCase();return symbols[`${b}/${q}`]?.symbol||`NEO:${b}-${q}`}
  function status(book){const bids=Number(book?.bids||0),asks=Number(book?.asks||0);if(bids>0&&asks>0)return 'OPEN';if(bids>0||asks>0)return 'PARTIAL BOOK';return 'NO LIVE ORDERS'}
  window.NEOMarketSymbols=Object.freeze({primaryAsset:'NOMNI',market:'N.O.M.N.I.',symbols,canonical,status});
})();
