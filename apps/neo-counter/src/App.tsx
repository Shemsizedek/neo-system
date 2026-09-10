import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getReadOnlyRail } from './rails';
import type { Rail, RailQuote } from './rails/types';
import DevicePanel from './devices/DevicePanel';
import MerchantOpsPanel from './merchant/MerchantOpsPanel';
import SyncPanel from './sync/SyncPanel';
import AuthPanel from './auth/AuthPanel';
import type { Session } from './auth/session';
import { currentSession } from './auth/session';
import { loadMerchantOps, saveMerchantOps } from './merchant/store';
import type { CatalogItem } from './merchant/types';
import { checkoutResultUrl, intentCartItem, readCheckoutIntent } from './gateway/intent';
import { formatGatewayDisplay, gatewayRails } from './gateway/money';

type CartLine = CatalogItem & { qty:number };
type Tx = { id:string; total:number; rail:Rail; status:string; createdAt:string; reference?:string; asset?:string };
type MerchantView='Register'|'Transactions'|'CRM'|'Catalog'|'Devices'|'Sync'|'Treasury'|'Settings'|'Access';

const RECEIVE_ADDRESS = import.meta.env.VITE_NEO_COUNTER_RECEIVE_ADDRESS || '';
const CART_KEY='neo-counter-cart-v1';
const TX_KEY='neo-counter-transactions-v1';
const NAV:MerchantView[]=['Register','Transactions','CRM','Catalog','Devices','Sync','Treasury','Settings','Access'];

function loadStored<T>(key:string,fallback:T):T{
  try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}
}

export default function App(){
  const gatewayIntent=useMemo(()=>readCheckoutIntent(),[]);
  const [ops,setOps]=useState(loadMerchantOps);
  const [session,setSession]=useState<Session|null>(currentSession());
  const [view,setView]=useState<MerchantView>('Register');
  const [cart,setCart]=useState<CartLine[]>(()=>gatewayIntent?[{...intentCartItem(gatewayIntent),qty:1}]:loadStored(CART_KEY,[]));
  const [rail,setRail]=useState<Rail>(gatewayIntent?.rail||(gatewayIntent?.asset?'XCP':'BTC'));
  const [checkout,setCheckout]=useState(Boolean(gatewayIntent));
  const [status,setStatus]=useState<'idle'|'quoting'|'awaiting_payment'|'detected'|'settled'|'error'>('idle');
  const [transactions,setTransactions]=useState<Tx[]>(()=>loadStored(TX_KEY,[]));
  const [quote,setQuote]=useState<RailQuote|null>(null);
  const [message,setMessage]=useState('');
  const [startedAt,setStartedAt]=useState('');
  const [online,setOnline]=useState(navigator.onLine);
  const [fullscreen,setFullscreen]=useState(Boolean(document.fullscreenElement));
  const [gatewayBooted,setGatewayBooted]=useState(false);

  useEffect(()=>{localStorage.setItem(CART_KEY,JSON.stringify(cart));},[cart]);
  useEffect(()=>{localStorage.setItem(TX_KEY,JSON.stringify(transactions.slice(0,100)));},[transactions]);
  useEffect(()=>{saveMerchantOps(ops);},[ops]);
  useEffect(()=>{
    const sync=()=>setOnline(navigator.onLine); const onFs=()=>setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('online',sync); window.addEventListener('offline',sync); document.addEventListener('fullscreenchange',onFs);
    return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync);document.removeEventListener('fullscreenchange',onFs);};
  },[]);

  const location=ops.locations.find(x=>x.id===ops.activeLocationId) || ops.locations[0];
  const taxRule=ops.taxRules.find(x=>x.id===location?.taxRuleId);
  const products=ops.catalog.filter(x=>x.active && (!x.inventoryTracked || x.quantity>0));
  const subtotal=useMemo(()=>cart.reduce((s,l)=>s+l.price*l.qty,0),[cart]);
  const tax=gatewayIntent?0:(taxRule?.enabled ? Math.round(subtotal*taxRule.rate) : 0);
  const total=subtotal+tax;
  const checkoutCurrency=gatewayIntent?.currency||ops.merchant.currency;
  const checkoutRails=gatewayRails(checkoutCurrency);
  const displayTotal=gatewayIntent?formatGatewayDisplay(total,checkoutCurrency):`$${(total/100).toFixed(2)} ${checkoutCurrency}`;
  const paymentId=useMemo(()=>`neo_pi_${crypto.randomUUID()}`,[checkout]);
  const quoted=quote?.unitAmount ?? 0;
  const qrPayload=RECEIVE_ADDRESS && quote?`neo-counter:${quote.asset}:${quoted.toFixed(8)}:${paymentId}:${RECEIVE_ADDRESS}`:`neo-counter:configuration-required:${paymentId}`;

  const has=(permission:string)=>Boolean(session&&(session.permissions.includes('*')||session.permissions.includes(permission)));
  const accessLevel=!session?'Local register':has('*')?'Platform Admin':has('settings')&&has('reports')?'Company Admin':has('reports')?'Manager':has('register')?'Cashier':'Viewer';
  const canOpen=(next:MerchantView)=>{
    if(next==='Register'||next==='Access')return true;
    if(next==='Transactions')return has('reports')||has('refunds')||has('register');
    if(next==='CRM')return has('reports')||has('settings');
    if(next==='Catalog')return has('catalog')||has('settings');
    if(next==='Devices')return has('devices')||has('settings');
    if(next==='Sync')return has('settings');
    if(next==='Treasury')return has('reports')||has('settings');
    return has('settings');
  };
  const openView=(next:MerchantView)=>{if(canOpen(next))setView(next);};

  const add=(p:CatalogItem)=>setCart(c=>{const hit=c.find(x=>x.id===p.id);return hit?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1}];});
  const remove=(id:string)=>setCart(c=>c.map(x=>x.id===id?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0));
  const toggleFullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setMessage('Fullscreen mode is not available on this device.');}};

  const loadQuote=async(nextRail:Rail=rail)=>{
    setRail(nextRail); setQuote(null); setMessage('');
    if(nextRail==='USD'){
      const now=Date.now();
      setQuote({rail:'USD',asset:'USD',unitAmount:total/100,source:'Display currency only',quotedAt:new Date(now).toISOString(),expiresAt:new Date(now+60_000).toISOString()});
      setStartedAt(new Date().toISOString()); setStatus('awaiting_payment');
      if(gatewayIntent)setMessage('USD is display/manual mode. External NEO services must not treat it as cryptographic settlement proof.');
      return;
    }
    if(gatewayIntent?.asset && gatewayIntent.assetAmount && (nextRail==='XCP'||nextRail==='NOMNI')){
      const now=Date.now();
      setQuote({rail:nextRail,asset:gatewayIntent.asset,unitAmount:gatewayIntent.assetAmount,source:'NEO service checkout intent · explicit asset amount',quotedAt:new Date(now).toISOString(),expiresAt:new Date(now+300_000).toISOString()});
      setStartedAt(new Date().toISOString()); setStatus('awaiting_payment');
      setMessage(`Treasury asset ${gatewayIntent.asset} selected. Settlement is verified against Counterparty receives; the caller remains responsible for pricing accuracy.`);
      return;
    }
    if(!online){setStatus('error');setMessage('Network is offline. Cart is saved locally; live quote requests are paused.');return;}
    setStatus('quoting');
    try{const nextQuote=await getReadOnlyRail(nextRail,gatewayIntent?.asset).quote(total/100);setQuote(nextQuote);setStartedAt(new Date().toISOString());setStatus('awaiting_payment');}catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Quote unavailable');}
  };

  useEffect(()=>{
    if(gatewayIntent && checkout && total>0 && !gatewayBooted){
      setGatewayBooted(true);
      void loadQuote(gatewayIntent.rail||(gatewayIntent.asset?'XCP':'BTC'));
    }
  },[gatewayIntent,checkout,total,gatewayBooted]);

  const openCheckout=async()=>{setCheckout(true);await loadQuote(rail);};
  const observePayment=async()=>{
    if(rail==='USD'){
      setStatus('settled');
      setTransactions(t=>[{id:paymentId,total,rail,status:'manual',createdAt:new Date().toISOString(),asset:'USD'},...t]);
      setMessage('Manual/display settlement recorded locally. No cryptographic settlement reference exists.');
      return;
    }
    if(!online){setStatus('error');setMessage('Network is offline. Reconnect before checking payment status.');return;}
    if(!RECEIVE_ADDRESS||!quote){setStatus('error');setMessage('Merchant receive address or quote is not configured.');return;}
    setMessage('Checking network…');
    try{const observation=await getReadOnlyRail(rail,quote.asset).observe({address:RECEIVE_ADDRESS,expectedAmount:quote.unitAmount,startedAt});if(!observation.detected){setStatus('awaiting_payment');setMessage(`No matching ${quote.asset} payment detected via ${observation.source}.`);return;}setStatus(observation.confirmed?'settled':'detected');setMessage(observation.confirmed?`${quote.asset} payment confirmed.`:'Payment detected; awaiting confirmation.');if(observation.confirmed&&!transactions.some(t=>t.id===paymentId)){setTransactions(t=>[{id:paymentId,total,rail,status:'settled',createdAt:new Date().toISOString(),reference:observation.reference,asset:quote.asset},...t]);}}catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Network observation failed');}
  };
  const reset=()=>{setCart([]);setCheckout(false);setStatus('idle');setQuote(null);setMessage('');};
  const settledTx=transactions.find(t=>t.id===paymentId);
  const returnToService=()=>{if(gatewayIntent?.successUrl)window.location.assign(checkoutResultUrl(gatewayIntent.successUrl,'success',paymentId,settledTx?.reference));};
  const cancelCheckout=()=>{if(gatewayIntent?.cancelUrl){window.location.assign(checkoutResultUrl(gatewayIntent.cancelUrl,'cancel',paymentId));return;}setCheckout(false);};

  const registerView=<section className="grid"><div className="panel catalog"><div className="section-head"><h2>Catalog</h2><span>{products.length} items</span></div><div className="product-grid">{products.map(p=><button className="product" key={p.id} onClick={()=>add(p)}><span>{p.category} · {p.sku}</span><strong>{p.name}</strong><b>${(p.price/100).toFixed(2)}</b>{p.inventoryTracked&&<small>{p.quantity} available</small>}</button>)}</div></div><div className="panel cart"><h2>Current Sale</h2>{cart.length===0?<div className="empty">Tap an item to start a sale.</div>:cart.map(l=><div className="line" key={l.id}><div><strong>{l.name}</strong><small>{l.qty} × ${(l.price/100).toFixed(2)}</small></div><button aria-label={`Remove one ${l.name}`} onClick={()=>remove(l.id)}>−</button></div>)}<div className="totals"><div><span>Subtotal</span><b>${(subtotal/100).toFixed(2)}</b></div><div><span>{taxRule?.name||'Tax'}</span><b>${(tax/100).toFixed(2)}</b></div><div className="grand"><span>Total</span><b>${(total/100).toFixed(2)}</b></div></div><button className="pay" disabled={!cart.length} onClick={openCheckout}>Charge ${(total/100).toFixed(2)}</button></div></section>;
  const transactionsView=<section className="panel tx"><div className="section-head"><h2>Transactions</h2><span>{transactions.length} recorded</span></div>{transactions.length===0?<div className="empty">No transactions yet.</div>:transactions.map(t=><div className="txrow" key={t.id}><span>{t.id}</span><span>{t.asset||t.rail}</span><strong>${(t.total/100).toFixed(2)}</strong><em>{t.status}</em></div>)}</section>;
  const crmView=<section className="panel merchant-ops"><div className="section-head"><div><h2>Company CRM Access</h2><p>Merchant-scoped administration. Server permissions remain authoritative.</p></div><span>{accessLevel}</span></div><div className="ops-grid"><div className="ops-card"><h3>Company</h3><strong>{ops.merchant.name}</strong><p>{ops.merchant.id}</p><small>{session?.merchantId==='*'?'All merchant accounts':`Scope: ${session?.merchantId||'sign in required'}`}</small></div><div className="ops-card"><h3>Current Access</h3><strong>{accessLevel}</strong><p>{session?session.permissions.join(', ')||'viewer':'Register only until authenticated'}</p></div><div className="ops-card wide"><h3>Access Levels</h3><div className="access-matrix"><span><b>Platform Admin</b><small>All companies, reporting, configuration and support.</small></span><span><b>Company Admin</b><small>Own company settings, staff, catalog, devices, CRM and reports.</small></span><span><b>Manager</b><small>Operations, reports, CRM and approved refunds.</small></span><span><b>Cashier</b><small>Register and sale workflow only.</small></span><span><b>Viewer</b><small>Read-only company visibility where explicitly granted.</small></span></div></div><div className="ops-card wide"><h3>Company Staff</h3>{ops.staff.map(member=><div className="staff-row" key={member.id}><div><strong>{member.name}</strong><small>{member.role}</small></div><div className="perm-list">{member.permissions.map(p=><span key={p} className="granted">{p}</span>)}</div></div>)}</div></div></section>;
  const catalogView=<section className="panel catalog"><div className="section-head"><h2>Catalog</h2><span>{products.length} active</span></div><div className="product-grid">{products.map(p=><button className="product" key={p.id} onClick={()=>{add(p);setView('Register')}}><span>{p.category} · {p.sku}</span><strong>{p.name}</strong><b>${(p.price/100).toFixed(2)}</b><small>{p.inventoryTracked?`${p.quantity} in stock`:'Inventory not tracked'}</small></button>)}</div></section>;
  const treasuryView=<section className="panel"><div className="section-head"><div><h2>Treasury & Settlement</h2><p>Read-only operational status for this merchant.</p></div><span>{RECEIVE_ADDRESS?'Configured':'Needs receive address'}</span></div><div className="ops-grid"><div className="ops-card"><h3>Receive Address</h3><p>{RECEIVE_ADDRESS||'VITE_NEO_COUNTER_RECEIVE_ADDRESS is not configured.'}</p></div><div className="ops-card"><h3>Supported Rails</h3><p>BTC · XCP · NOMNI · verified Counterparty assets</p></div></div></section>;
  const lockedView=<section className="panel access-locked"><h2>Access required</h2><p>Sign in with a company terminal/staff session to open this workspace.</p><button className="pay" onClick={()=>setView('Access')}>Open Access</button></section>;
  const renderView=()=>{
    if(!canOpen(view))return lockedView;
    if(view==='Register')return registerView;
    if(view==='Transactions')return transactionsView;
    if(view==='CRM')return crmView;
    if(view==='Catalog')return catalogView;
    if(view==='Devices')return <DevicePanel />;
    if(view==='Sync')return <SyncPanel state={ops} onRemote={setOps} online={online} session={session}/>;
    if(view==='Treasury')return treasuryView;
    if(view==='Settings')return <MerchantOpsPanel state={ops} onChange={setOps}/>;
    return <AuthPanel merchantId={ops.merchant.id} onSession={next=>{setSession(next);if(next)setView('Register')}}/>;
  };

  return <div className="app-shell">
    {!gatewayIntent&&<aside className="sidebar"><div><div className="brand">NEO Counter</div><div className="tag">Merchant Commerce Terminal</div></div><nav>{NAV.map(x=><button key={x} className={view===x?'active':''} disabled={!canOpen(x)} onClick={()=>openView(x)}>{x}</button>)}</nav><div className="mode"><span className={`live-pulse ${online?'on':''}`}/>{online?'Live':'Offline'} · {accessLevel}</div></aside>}
    <main className={gatewayIntent?'checkout-main':''}>
      <header><div><h1>{gatewayIntent?'NEO Checkout Gateway':view}</h1><p>{gatewayIntent?`${gatewayIntent.service} · ${gatewayIntent.orderId}`:`${ops.merchant.name} · ${location?.name}`}</p></div><div className="header-actions"><span className={`net ${online?'online':'offline'}`}>{online?'Online':'Offline'}</span>{!gatewayIntent&&<button className="terminal-btn" onClick={toggleFullscreen}>{fullscreen?'Exit Fullscreen':'Terminal Mode'}</button>}<div className="merchant">{gatewayIntent?'Retail Checkout':accessLevel}</div></div></header>
      {gatewayIntent?null:renderView()}
    </main>
    {!gatewayIntent&&<nav className="mobile-nav" aria-label="NEO Counter mobile navigation">{(['Register','Transactions','CRM','Access'] as MerchantView[]).map(x=><button key={x} className={view===x?'active':''} disabled={!canOpen(x)} onClick={()=>openView(x)}>{x}</button>)}</nav>}
    {checkout&&<div className="modal-wrap"><div className="modal"><div className="modal-head"><div><h2>{gatewayIntent?.label||ops.receiptTemplates.find(x=>x.id===ops.activeReceiptTemplateId)?.header||'Payment Intent'}</h2><small>{gatewayIntent?`${gatewayIntent.service} · ${gatewayIntent.orderId}`:paymentId}</small></div><button aria-label="Close checkout" onClick={cancelCheckout}>×</button></div><div className="rail-row">{checkoutRails.map(r=><button key={r} className={rail===r?'selected':''} onClick={()=>loadQuote(r)}>{r}</button>)}</div><div className="checkout-body"><QRCodeSVG value={qrPayload} size={190}/><div><label>Customer pays</label><div className="asset-amount">{quote?`${quoted.toFixed(8)} ${quote.asset}`:'—'}</div><p>Display total: {displayTotal}</p>{gatewayIntent?.asset&&<p>Treasury asset: {gatewayIntent.asset}</p>}<p>Quote source: {quote?.source||'Not available'}</p><p>Receive address: {RECEIVE_ADDRESS||'Not configured'}</p><div className={`status ${status}`}>{status.replaceAll('_',' ')}</div>{message&&<p>{message}</p>}</div></div><div className="actions">{status==='settled'?(gatewayIntent?.successUrl?<button className="pay" onClick={returnToService}>Return to {gatewayIntent.service}</button>:<button className="pay" onClick={reset}>New Sale</button>):<button className="pay" disabled={status==='quoting'} onClick={observePayment}>{status==='quoting'?'Loading quote…':'Check Network'}</button>}</div><small className="disclaimer">NEO Counter is the shared checkout UI and read-only settlement observer. Caller parameters are not payment proof. External services must verify the returned settlement reference before fulfillment. No private-key custody, server-side signing, or raw card processing.</small></div></div>}
  </div>;
}
