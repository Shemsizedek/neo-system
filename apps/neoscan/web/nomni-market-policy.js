(()=>{
  const policy=Object.freeze({
    schema:'neo.market.policy.v1',
    terminalName:'NEO Market Terminal',
    marketName:'N.O.M.N.I.',
    marketLongName:'Noocratic Open Market Natural Index',
    primaryAsset:'NOMNI',
    primaryAssetLabel:'NOMNI — Primary NEO Asset',
    settlementBase:'Bitcoin',
    publicProtocolLabel:'NEO Market Layer',
    secondaryAssets:Object.freeze({XCP:'XCP — Bitcoin Community Smart-Contract Obligations'}),
    principles:Object.freeze([
      'NOMNI is the primary asset of the NEO market.',
      'XCP is a secondary asset representing smart-contract or tokenized obligations of the Bitcoin community.',
      'Bitcoin remains the settlement and security base.',
      'Underlying protocol/API names remain internal implementation details and are not the public market identity.'
    ])
  });
  window.NEO_MARKET_POLICY=policy;
  const replacements=[
    [/Counterparty-backed NEO ecosystem asset intelligence and public balances\./g,'NEO-market asset intelligence and public balances, centered on NOMNI.'],
    [/Search NEO ecosystem assets and Counterparty balances from one public explorer\./g,'Search the N.O.M.N.I. market, NOMNI-first NEO assets, and public balances from one explorer.'],
    [/NEO Ledger/g,'NEO Market Terminal'],
    [/Asset protocol/g,'NEO market layer'],
    [/Counterparty balances/g,'NEO asset balances'],
    [/Counterparty balance/g,'NEO asset balance'],
    [/Counterparty address/g,'NEO address'],
    [/Bitcoin \/ Counterparty/g,'Bitcoin / NEO Market Layer'],
    [/Counterparty Core v2/g,'NEO market data service'],
    [/Counterparty on Bitcoin/g,'NEO market settlement on Bitcoin'],
    [/Counterparty native unit/g,'NEO secondary market unit'],
    [/Counterparty Holdings/g,'NEO Market Holdings'],
    [/Counterparty:/g,'NEO Market:'],
    [/COUNTERPARTY/g,'NEO MARKET'],
    [/Counterparty/g,'NEO market']
  ];
  function rewriteText(root=document.body){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){let value=node.nodeValue;for(const [pattern,replacement] of replacements)value=value.replace(pattern,replacement);if(value!==node.nodeValue)node.nodeValue=value;}}
  function decorate(){
    rewriteText();
    for(const button of [...document.querySelectorAll('[data-example="XCP"]')])button.remove();
    const xcp=[...document.querySelectorAll('.treasury-card span,.holding span')].filter(el=>el.textContent.trim()==='XCP');
    for(const el of xcp){el.title=policy.secondaryAssets.XCP;el.setAttribute('aria-label',policy.secondaryAssets.XCP);el.closest('.treasury-card,.holding')?.classList.add('secondary-asset');}
    const result=document.getElementById('result');
    if((location.hash==='#market'||location.hash==='#ledger')&&result&&!result.querySelector('.nomni-market-banner'))result.insertAdjacentHTML('afterbegin',`<div class="nomni-market-banner"><strong>${policy.terminalName}</strong><span>${policy.marketName} · ${policy.marketLongName}</span><small>Primary asset: ${policy.primaryAsset} · Bitcoin settlement base · XCP is secondary smart-contract obligation inventory.</small></div>`);
  }
  const observer=new MutationObserver(()=>decorate());window.addEventListener('DOMContentLoaded',()=>{decorate();observer.observe(document.body,{subtree:true,childList:true,characterData:true});});window.addEventListener('hashchange',()=>queueMicrotask(decorate));
})();
