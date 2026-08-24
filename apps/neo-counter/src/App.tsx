import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getReadOnlyRail } from './rails';
import type { Rail, RailQuote } from './rails/types';
import DevicePanel from './devices/DevicePanel';
import MerchantOpsPanel from './merchant/MerchantOpsPanel';
import { loadMerchantOps, saveMerchantOps } from './merchant/store';
import type { CatalogItem } from './merchant/types';

type CartLine = CatalogItem & { qty:number };
type Tx = { id:string; total:number; rail:Rail; status:string; createdAt:string; reference?:string };

const RECEIVE_ADDRESS = import.meta.env.VITE_NEO_COUNTER_RECEIVE_ADDRESS || '';
const CART_KEY='neo-counter-cart-v1';
const TX_KEY='neo-counter-transactions-v1';

function loadStored<T>(key:string,fallback:T):T{
  try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}
}

export default function App(){
  const [ops,setOps]=useState(loadMerchantOps);
  const [cart,setCart]=useState<CartLine[]>(()=>loadStored(CART_KEY,[]));
  const [rail,setRail]=useState<Rail>('BTC');
  const [checkout,setCheckout]=useState(false);
  const [status,setStatus]=useState<'idle'|'quoting'|'awaiting_payment'|'detected'|'settled'|'error'>('idle');
  const [transactions,setTransactions]=useState<Tx[]>(()=>loadStored(TX_KEY,[]));
  const [quote,setQuote]=useState<RailQuote|null>(null);
  const [message,setMessage]=useState('');
  const [startedAt,setStartedAt]=useState('');
  const [online,setOnline]=useState(navigator.onLine);
  const [fullscreen,setFullscreen]=useState(Boolean(document.fullscreenElement));

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
  const tax=taxRule?.enabled ? Math.round(subtotal*taxRule.rate) : 0;
  const total=subtotal+tax;
  const paymentId=useMemo(()=>`neo_pi_${crypto.randomUUID()}`,[checkout]);
  const quoted=quote?.unitAmount ?? 0;
  const qrPayload=RECEIVE_ADDRESS && quote?`neo-counter:${rail}:${quoted.toFixed(8)}:${paymentId}:${RECEIVE_ADDRESS}`:`neo-counter:configuration-required:${paymentId}`;

  const add=(p:CatalogItem)=>setCart(c=>{const hit=c.find(x=>x.id===p.id);return hit?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1}];});
  const remove=(id:string)=>setCart(c=>c.map(x=>x.id===id?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0));
  const toggleFullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setMessage('Fullscreen mode is not available on this device.');}};

  const loadQuote=async(nextRail:Rail=rail)=>{
    setRail(nextRail); setQuote(null); setMessage('');
    if(nextRail==='USD'){const now=Date.now();setQuote({rail:'USD',asset:'USD',unitAmount:total/100,source:'Display currency',quotedAt:new Date(now).toISOString(),expiresAt:new Date(now+60_000).toISOString()});setStartedAt(new Date().toISOString());setStatus('awaiting_payment');return;}
    if(!online){setStatus('error');setMessage('Network is offline. Cart is saved locally; live quote requests are paused.');return;}
    setStatus('quoting');
    try{const nextQuote=await getReadOnlyRail(nextRail).quote(total/100);setQuote(nextQuote);setStartedAt(new Date().toISOString());setStatus('awaiting_payment');}catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Quote unavailable');}
  };
  const openCheckout=async()=>{setCheckout(true);await loadQuote(rail);};
  const observePayment=async()=>{
    if(rail==='USD'){setStatus('settled');setTransactions(t=>[{id:paymentId,total,rail,status:'settled',createdAt:new Date().toISOString()},...t]);return;}
    if(!online){setStatus('error');setMessage('Network is offline. Reconnect before checking payment status.');return;}
    if(!RECEIVE_ADDRESS||!quote){setStatus('error');setMessage('Merchant receive address or quote is not configured.');return;}
    setMessage('Checking network…');
    try{const observation=await getReadOnlyRail(rail).observe({address:RECEIVE_ADDRESS,expectedAmount:quote.unitAmount,startedAt});if(!observation.detected){setStatus('awaiting_payment');setMessage(`No matching payment detected via ${observation.source}.`);return;}setStatus(observation.confirmed?'settled':'detected');setMessage(observation.confirmed?'Payment confirmed.':'Payment detected; awaiting confirmation.');if(observation.confirmed&&!transactions.some(t=>t.id===paymentId)){setTransactions(t=>[{id:paymentId,total,rail,status:'settled',createdAt:new Date().toISOString(),reference:observation.reference},...t]);}}catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Network observation failed');}
  };
  const reset=()=>{setCart([]);setCheckout(false);setStatus('idle');setQuote(null);setMessage('');};

  return <div className="app-shell">
    <aside className="sidebar"><div><div className="brand">NEO Counter</div><div className="tag">Bitcoin Commerce Network</div></div><nav>{['Register','Transactions','Customers','Catalog','Devices','Treasury','Settings'].map((x,i)=><button key={x} className={i===0?'active':''}>{x}</button>)}</nav><div className="mode">Live read-only rails · signing disabled</div></aside>
    <main>
      <header><div><h1>Merchant Register</h1><p>{location?.name} · {taxRule?.enabled?`${(taxRule.rate*100).toFixed(2)}% tax`:'Tax disabled'}</p></div><div className="header-actions"><span className={`net ${online?'online':'offline'}`}>{online?'Online':'Offline'}</span><button className="terminal-btn" onClick={toggleFullscreen}>{fullscreen?'Exit Fullscreen':'Terminal Mode'}</button><div className="merchant">{ops.merchant.name}</div></div></header>
      <section className="grid"><div className="panel catalog"><h2>Catalog</h2><div className="product-grid">{products.map(p=><button className="product" key={p.id} onClick={()=>add(p)}><span>{p.category} · {p.sku}</span><strong>{p.name}</strong><b>${(p.price/100).toFixed(2)}</b>{p.inventoryTracked&&<small>{p.quantity} available</small>}</button>)}</div></div><div className="panel cart"><h2>Current Sale</h2>{cart.length===0?<div className="empty">Tap an item to start a sale.</div>:cart.map(l=><div className="line" key={l.id}><div><strong>{l.name}</strong><small>{l.qty} × ${(l.price/100).toFixed(2)}</small></div><button aria-label={`Remove one ${l.name}`} onClick={()=>remove(l.id)}>−</button></div>)}<div className="totals"><div><span>Subtotal</span><b>${(subtotal/100).toFixed(2)}</b></div><div><span>{taxRule?.name||'Tax'}</span><b>${(tax/100).toFixed(2)}</b></div><div className="grand"><span>Total</span><b>${(total/100).toFixed(2)}</b></div></div><button className="pay" disabled={!cart.length} onClick={openCheckout}>Charge ${(total/100).toFixed(2)}</button></div></section>
      <MerchantOpsPanel state={ops} onChange={setOps}/>
      <DevicePanel />
      <section className="panel tx"><div className="section-head"><h2>Recent transactions</h2><span>{transactions.length} settled</span></div>{transactions.length===0?<div className="empty">No transactions yet.</div>:transactions.map(t=><div className="txrow" key={t.id}><span>{t.id}</span><span>{t.rail}</span><strong>${(t.total/100).toFixed(2)}</strong><em>{t.status}</em></div>)}</section>
    </main>
    <nav className="mobile-nav" aria-label="NEO Counter mobile navigation"><button className="active">Register</button><button>Transactions</button><button>Catalog</button><button>Settings</button></nav>
    {checkout&&<div className="modal-wrap"><div className="modal"><div className="modal-head"><div><h2>{ops.receiptTemplates.find(x=>x.id===ops.activeReceiptTemplateId)?.header||'Payment Intent'}</h2><small>{paymentId}</small></div><button aria-label="Close checkout" onClick={()=>setCheckout(false)}>×</button></div><div className="rail-row">{(['BTC','XCP','NOMNI','USD'] as Rail[]).map(r=><button key={r} className={rail===r?'selected':''} onClick={()=>loadQuote(r)}>{r}</button>)}</div><div className="checkout-body"><QRCodeSVG value={qrPayload} size={190}/><div><label>Customer pays</label><div className="asset-amount">{quote?`${quoted.toFixed(8)} ${rail}`:'—'}</div><p>Display total: ${(total/100).toFixed(2)} {ops.merchant.currency}</p><p>Quote source: {quote?.source||'Not available'}</p><p>Receive address: {RECEIVE_ADDRESS||'Not configured'}</p><div className={`status ${status}`}>{status.replaceAll('_',' ')}</div>{message&&<p>{message}</p>}</div></div><div className="actions">{status==='settled'?<button className="pay" onClick={reset}>New Sale</button>:<button className="pay" disabled={status==='quoting'} onClick={observePayment}>{status==='quoting'?'Loading quote…':'Check Network'}</button>}</div><small className="disclaimer">Read-only network observation. No transaction composition, signing, broadcasting, custody, fiat transmission, or live card processing.</small></div></div>}
  </div>;
}
