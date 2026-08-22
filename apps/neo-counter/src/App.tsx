import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type Product = { id:string; name:string; price:number; category:string };
type CartLine = Product & { qty:number };
type Rail = 'BTC'|'XCP'|'NOMNI'|'USD';
type Tx = { id:string; total:number; rail:Rail; status:string; createdAt:string };

const products: Product[] = [
  { id:'p1', name:'NEO Membership', price:14400, category:'Services' },
  { id:'p2', name:'Consultation', price:28800, category:'Services' },
  { id:'p3', name:'NEO Market Kit', price:7200, category:'Retail' },
  { id:'p4', name:'Digital Access Pass', price:3600, category:'Digital' },
];

const quotes: Record<Rail, number> = { BTC:0.0000108, XCP:0.0582, NOMNI:1.85, USD:1 };
const symbol: Record<Rail,string> = { BTC:'BTC', XCP:'XCP', NOMNI:'NOMNI', USD:'USD' };

export default function App(){
  const [cart,setCart]=useState<CartLine[]>([]);
  const [rail,setRail]=useState<Rail>('BTC');
  const [checkout,setCheckout]=useState(false);
  const [status,setStatus]=useState<'awaiting_payment'|'settled'>('awaiting_payment');
  const [transactions,setTransactions]=useState<Tx[]>([]);

  const subtotal=useMemo(()=>cart.reduce((s,l)=>s+l.price*l.qty,0),[cart]);
  const tax=Math.round(subtotal*0.0825);
  const total=subtotal+tax;
  const quoted=((total/100)*quotes[rail]);
  const paymentId=`neo_pi_${String(transactions.length+1).padStart(6,'0')}`;
  const qrPayload=`neo-counter:${rail}:${quoted.toFixed(8)}:${paymentId}`;

  const add=(p:Product)=>setCart(c=>{
    const hit=c.find(x=>x.id===p.id);
    return hit?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1}];
  });
  const remove=(id:string)=>setCart(c=>c.map(x=>x.id===id?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0));
  const settle=()=>{
    setStatus('settled');
    setTransactions(t=>[{id:paymentId,total,rail,status:'settled',createdAt:new Date().toISOString()},...t]);
  };
  const reset=()=>{ setCart([]); setCheckout(false); setStatus('awaiting_payment'); };

  return <div className="app-shell">
    <aside className="sidebar">
      <div><div className="brand">NEO Counter</div><div className="tag">Bitcoin Commerce Network</div></div>
      <nav>{['Register','Transactions','Customers','Catalog','Treasury','Settings'].map((x,i)=><button key={x} className={i===0?'active':''}>{x}</button>)}</nav>
      <div className="mode">Prototype mode · Mock settlement</div>
    </aside>

    <main>
      <header><div><h1>Merchant Register</h1><p>Accept Bitcoin, Counterparty assets, and world-currency pricing.</p></div><div className="merchant">NEO Merchant #144</div></header>
      <section className="grid">
        <div className="panel catalog"><h2>Catalog</h2><div className="product-grid">{products.map(p=><button className="product" key={p.id} onClick={()=>add(p)}><span>{p.category}</span><strong>{p.name}</strong><b>${(p.price/100).toFixed(2)}</b></button>)}</div></div>
        <div className="panel cart"><h2>Current Sale</h2>{cart.length===0?<div className="empty">Tap an item to start a sale.</div>:cart.map(l=><div className="line" key={l.id}><div><strong>{l.name}</strong><small>{l.qty} × ${(l.price/100).toFixed(2)}</small></div><button onClick={()=>remove(l.id)}>−</button></div>)}
          <div className="totals"><div><span>Subtotal</span><b>${(subtotal/100).toFixed(2)}</b></div><div><span>Tax</span><b>${(tax/100).toFixed(2)}</b></div><div className="grand"><span>Total</span><b>${(total/100).toFixed(2)}</b></div></div>
          <button className="pay" disabled={!cart.length} onClick={()=>setCheckout(true)}>Charge ${(total/100).toFixed(2)}</button>
        </div>
      </section>

      <section className="panel tx"><div className="section-head"><h2>Recent transactions</h2><span>{transactions.length} settled</span></div>{transactions.length===0?<div className="empty">No transactions yet.</div>:transactions.map(t=><div className="txrow" key={t.id}><span>{t.id}</span><span>{t.rail}</span><strong>${(t.total/100).toFixed(2)}</strong><em>{t.status}</em></div>)}</section>
    </main>

    {checkout&&<div className="modal-wrap"><div className="modal">
      <div className="modal-head"><div><h2>Payment Intent</h2><small>{paymentId}</small></div><button onClick={()=>setCheckout(false)}>×</button></div>
      <div className="rail-row">{(['BTC','XCP','NOMNI','USD'] as Rail[]).map(r=><button key={r} className={rail===r?'selected':''} onClick={()=>{setRail(r);setStatus('awaiting_payment')}}>{r}</button>)}</div>
      <div className="checkout-body"><QRCodeSVG value={qrPayload} size={190}/><div><label>Customer pays</label><div className="asset-amount">{quoted.toFixed(8)} {symbol[rail]}</div><p>Display total: ${(total/100).toFixed(2)} USD</p><p>Quote source: NEO Mock FX · expires in 60s</p><div className={`status ${status}`}>{status.replace('_',' ')}</div></div></div>
      <div className="actions">{status==='awaiting_payment'?<button className="pay" onClick={settle}>Simulate Payment Detected</button>:<button className="pay" onClick={reset}>New Sale</button>}</div>
      <small className="disclaimer">Prototype only. No production custody, fiat transmission, or live card processing.</small>
    </div></div>}
  </div>
}
