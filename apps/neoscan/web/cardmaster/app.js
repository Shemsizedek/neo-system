(() => {
  'use strict';
  const API = 'https://neo.holytemples.org/api/crown/cardmaster';
  const gallery = document.getElementById('gallery');
  const status = document.getElementById('feedStatus');
  const refresh = document.getElementById('refreshMarket');
  const demo = window.NEO_CROWN_CATALOG;
  let deck = demo;
  const el = (tag, className, text) => { const node=document.createElement(tag); if (className) node.className=className; if(text!==undefined)node.textContent=text;return node;};
  const finiteAge = time => Number.isFinite(Date.parse(time)) && Math.abs(Date.now()-Date.parse(time)) <= 300000;
  const idOkay = id => /^NEO-CARD-[A-Z0-9-]{3,80}$/.test(String(id));
  const allowedLink = link => {try{const u=new URL(link); return u.protocol==='https:'&&['api.counterparty.io','www.coingecko.com','mempool.space'].includes(u.hostname)?u.href:null;}catch{return null;}};
  const art = (record, face) => {
    const url = './art/' + record.card_id + '-' + face + '.svg';
    const img = el('img'); img.src=url;img.alt=record.title+' — '+face+' vector card artwork'; img.loading='lazy';img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>{
      const holder=img.parentNode;
      img.remove();
      const panel=el('div','art-placeholder');
      panel.style.cssText='height:100%;border:8px double #c4a261;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;background:radial-gradient(circle at center,#29363b,#0a1017);color:#ecd8a1';
      const mark=el('div','','✦');mark.style.cssText='font-size:80px;color:#c6a465';panel.append(mark);
      const heading=el('h3','',record.title);heading.style.cssText='font:700 26px Georgia,serif';panel.append(heading);
      panel.append(el('p','',face==='back'?'Submitted figures · not independently verified':'Static art not generated on this host'));
      holder?.append(panel);
    });
    return img;
  };
  const marketData = record => {
    const box=el('div','market'); const market=record.market_data || {};
    const q=market.quote;
    const current=market.state==='indicative'&&q&&finiteAge(q.retrieved_at)&&q.upstream_observation_time_verified===false;
    box.append(el('div','state',current?market.label:'NO CURRENT ATTRIBUTED MARKET QUOTE'));
    box.append(el('span','value',current?q.price+' '+q.quote_currency:'Price not established'));
    box.append(el('div','details',current?'Pair: '+q.pair+' · '+q.methodology+' · retrieved '+q.retrieved_at:'Market observation unavailable, expired, or unsupported.'));
    if(current){const link=allowedLink(q.source_url);if(link){const source=el('a','details','Source: '+q.source_name);source.href=link;source.rel='noopener noreferrer';source.target='_blank';box.append(source);}}
    return box;
  };
  const render = records => {
    gallery.replaceChildren();
    for(const record of records) {
      if(!record || !idOkay(record.card_id))continue;
      const item=el('article','item');
      const card=el('div','card-3d');
      const inner=el('div','card-inner');
      for(const face of ['front','back']) {const side=el('div','card-face '+(face==='back'?'back':''));side.append(art(record,face));inner.append(side);}
      card.append(inner);item.append(card);
      item.append(el('h3','',record.title)); item.append(el('p','sub',record.sector+' · '+record.card_id));
      item.append(marketData(record));
      item.append(el('p','claim','All financial and issuer claims are submitted and unverified.'));
      const actions=el('div','actions');
      const flip=el('button','','Flip card'); flip.type='button'; flip.setAttribute('aria-pressed','false');
      flip.addEventListener('click',()=>{const flipped=inner.classList.toggle('flipped');flip.textContent=flipped?'Show front':'Flip card';flip.setAttribute('aria-pressed',String(flipped));});
      const copy=el('button','','Copy artwork prompt');copy.type='button';
      copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(record.artwork?.prompt||'');copy.textContent='Copied prompt';}catch{copy.textContent='Clipboard unavailable';}});
      actions.append(flip,copy);item.append(actions);
      const details=el('details');details.append(el('summary','','Inspect metadata / provenance'));
      const pre=el('pre');pre.textContent=JSON.stringify(record,null,2);details.append(pre);item.append(details);
      item.append(el('p','card-hint','Vector art is a presentation; the card digest is an off-chain content hash.'));
      gallery.append(item);
    }
  };
  async function loadMarket() {
    refresh.disabled=true;status.textContent='Checking configured NEO market gateway…';
    const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),8500);
    try {
      const response=await fetch(API,{headers:{accept:'application/json'},credentials:'omit',cache:'no-store',signal:abort.signal});
      if(!response.ok)throw new Error('Endpoint returned '+response.status);
      const payload=await response.json();
      if(payload?.schema!=='NEO-CARDMASTER-COLLECTION-V1'||!Array.isArray(payload.cards)||payload.cards.length!==3)throw new Error('Invalid response schema');
      deck=payload;render(deck.cards);
      status.textContent='Source-attributed gateway response. Market indications are not executed trades; issuer claims remain unverified.';
    } catch {
      deck=demo;render(deck.cards);
      status.textContent='Gateway not available. Showing offline example cards with no current market quotes.';
    } finally {clearTimeout(timer);refresh.disabled=false;}
  }
  render(deck.cards);
  refresh.addEventListener('click',loadMarket);
})();
