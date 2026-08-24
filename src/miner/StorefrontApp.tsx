import {useMemo,useState} from 'react'
import {ArrowLeft,Bitcoin,Box,CheckCircle2,Cpu,Globe2,PackageCheck,ReceiptText,ShieldCheck,Truck,WalletCards,Zap} from 'lucide-react'
import {currencies} from './data'
import {digitalMinerProducts,quoteDigitalMiner} from './generator'
import './storefront.css'

type StoreMode='PHYSICAL'|'DIGITAL'
type OrderStatus='QUOTE'|'PAYMENT_PENDING'|'CONFIRMED'|'FULFILLING'|'ACTIVE'

type CustomerOrder={
  id:string
  mode:StoreMode
  sku:string
  product:string
  currency:string
  amountUsd:number
  status:OrderStatus
  createdAt:string
  hashrateTh?:number
}

const physicalProducts=[
  {sku:'NEO-MINER-ONE',name:'NEO Miner One',subtitle:'Modular SHA-256 mining appliance',status:'PLANNING',hashrateTh:120,priceUsd:3499},
  {sku:'NEO-MINER-PRO',name:'NEO Miner Pro',subtitle:'Higher-density professional mining appliance',status:'PLANNING',hashrateTh:250,priceUsd:6799},
  {sku:'NEO-MINER-RACK',name:'NEO Miner Rack',subtitle:'Rack-integrated multi-miner platform',status:'PLANNING',hashrateTh:1000,priceUsd:24999},
  {sku:'NEO-MINER-IMMERSION',name:'NEO Immersion Rack',subtitle:'Immersion-ready high-density platform',status:'PLANNING',hashrateTh:2000,priceUsd:44999}
]

const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)

export function StorefrontApp(){
  const[mode,setMode]=useState<StoreMode>('DIGITAL')
  const[currency,setCurrency]=useState('USD')
  const[digitalId,setDigitalId]=useState(digitalMinerProducts[1].id)
  const[physicalSku,setPhysicalSku]=useState(physicalProducts[0].sku)
  const[customer,setCustomer]=useState('Demo Customer')
  const[terms,setTerms]=useState(false)
  const[orders,setOrders]=useState<CustomerOrder[]>([])

  const currencyRecord=currencies.find(c=>c.code===currency)
  const digital=digitalMinerProducts.find(p=>p.id===digitalId)!
  const physical=physicalProducts.find(p=>p.sku===physicalSku)!
  const digitalQuote=useMemo(()=>quoteDigitalMiner(digital,currency),[digital,currency])
  const amountUsd=mode==='DIGITAL'?digitalQuote.totalUsd:physical.priceUsd
  const productName=mode==='DIGITAL'?digital.name:physical.name
  const purchasable=Boolean(currencyRecord?.payment)&&terms&&(mode==='DIGITAL'?digital.status==='AVAILABLE':physical.status==='AVAILABLE')

  const createOrder=()=>{
    if(!purchasable)return
    const order:CustomerOrder={
      id:`NMO-${Date.now()}`,
      mode,
      sku:mode==='DIGITAL'?digital.id:physical.sku,
      product:productName,
      currency,
      amountUsd,
      status:'PAYMENT_PENDING',
      createdAt:new Date().toISOString(),
      hashrateTh:mode==='DIGITAL'?digital.allocatedHashrateTh:physical.hashrateTh
    }
    setOrders(v=>[order,...v])
  }

  return <div className="ns-shell">
    <header className="ns-header"><div><a href="#/generator"><ArrowLeft size={16}/> NEO Generator</a><span>NEO MINER STORE v0.17</span><h1>Mine Bitcoin. Own Hardware. Lease Verified Hashpower.</h1><p>Physical NEO Miner products and contract-backed Digital NEO Miners with World Currency checkout architecture.</p></div><div className="ns-badge"><ShieldCheck size={18}/> DEMO / PRE-COMMERCIAL</div></header>

    <section className="ns-switch"><button className={mode==='DIGITAL'?'active':''} onClick={()=>setMode('DIGITAL')}><Bitcoin size={18}/> Digital NEO Miners</button><button className={mode==='PHYSICAL'?'active':''} onClick={()=>setMode('PHYSICAL')}><Box size={18}/> Physical NEO Miners</button></section>

    <section className="ns-grid">
      <div className="ns-panel">
        <div className="ns-title"><div><span>CATALOG</span><h2>{mode==='DIGITAL'?'Contract-backed Hashpower':'Physical Mining Hardware'}</h2></div>{mode==='DIGITAL'?<Cpu/>:<PackageCheck/>}</div>
        <div className="ns-products">{mode==='DIGITAL'?digitalMinerProducts.map(p=><button key={p.id} className={digitalId===p.id?'selected':''} onClick={()=>setDigitalId(p.id)}><div><b>{p.name}</b><em>{p.status}</em></div><strong>{p.allocatedHashrateTh>=1000?`${p.allocatedHashrateTh/1000} PH/s`:`${p.allocatedHashrateTh} TH/s`}</strong><span>{p.termMonths} months • reference {p.referenceEfficiencyJTh} J/TH</span><small>{money(p.basePriceUsd)} base service</small></button>):physicalProducts.map(p=><button key={p.sku} className={physicalSku===p.sku?'selected':''} onClick={()=>setPhysicalSku(p.sku)}><div><b>{p.name}</b><em>{p.status}</em></div><strong>{p.hashrateTh>=1000?`${p.hashrateTh/1000} PH/s`:`${p.hashrateTh} TH/s`}</strong><span>{p.subtitle}</span><small>{money(p.priceUsd)} planning price</small></button>)}</div>
      </div>

      <div className="ns-panel ns-checkout">
        <div className="ns-title"><div><span>WORLD CURRENCY CHECKOUT</span><h2>{productName}</h2></div><Globe2/></div>
        <label>Customer</label><input value={customer} onChange={e=>setCustomer(e.target.value)}/>
        <label>Payment currency</label><select value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name} [{c.status}]</option>)}</select>
        <div className="ns-quote"><div><span>Product</span><strong>{productName}</strong></div><div><span>Reference price</span><strong>{money(amountUsd)}</strong></div><div><span>Payment currency</span><strong>{currency}</strong></div><div><span>Payment rail</span><strong>{currencyRecord?.payment?'ENABLED':'NOT ENABLED'}</strong></div>{mode==='DIGITAL'&&<><div><span>Contract hashrate</span><strong>{digital.allocatedHashrateTh} TH/s</strong></div><div><span>Term</span><strong>{digital.termMonths} months</strong></div></>}</div>
        {!currencyRecord?.payment&&<div className="ns-warning">This currency is registered, but its live payment rail is not enabled.</div>}
        {(mode==='PHYSICAL'&&physical.status!=='AVAILABLE')&&<div className="ns-warning">Physical SKU remains PLANNING until production release gates are passed.</div>}
        <label className="ns-terms"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/><span>I accept the applicable product/contract terms and understand that projected mining performance and BTC production are not guaranteed.</span></label>
        <button className="ns-primary" disabled={!purchasable} onClick={createOrder}>Create payment-pending order</button>
        <p className="ns-footnote">No funds move in this demo. Live checkout requires configured payment, FX, compliance, tax/shipping, inventory/capacity and settlement providers.</p>
      </div>
    </section>

    <section className="ns-kpis"><Kpi icon={ReceiptText} title="Quote Lock" text="Source-backed rate + expiry"/><Kpi icon={WalletCards} title="World Currency" text="Only enabled rails can pay"/><Kpi icon={Truck} title="Physical Fulfillment" text="Serial → shipment → activation"/><Kpi icon={Zap} title="Digital Fulfillment" text="Capacity → contract → allocation"/></section>

    <section className="ns-panel"><div className="ns-title"><div><span>CUSTOMER PORTAL</span><h2>Order History & Activation</h2></div><ReceiptText/></div>{orders.length===0?<div className="ns-empty">No demo orders yet. Select an AVAILABLE product and enabled payment rail to create one.</div>:<div className="ns-orders">{orders.map(o=><div className="ns-order" key={o.id}><div><b>{o.product}</b><span>{o.id}</span></div><div><strong>{o.hashrateTh} TH/s</strong><span>{o.mode}</span></div><div><strong>{money(o.amountUsd)}</strong><span>{o.currency}</span></div><div><em>{o.status}</em><span>{new Date(o.createdAt).toLocaleString()}</span></div></div>)}</div>}</section>

    <section className="ns-panel ns-flow"><div className="ns-title"><div><span>CUSTOMER LIFECYCLE</span><h2>Commerce → Mining</h2></div><CheckCircle2/></div><p><b>Catalog</b> → Quote → Terms → Payment → Compliance → {mode==='PHYSICAL'?'Inventory Reservation → Shipment → Device Activation':'Hashpower Reservation → Contract Activation → Dynamic Allocation'} → Customer Dashboard → Support / Refund / RMA.</p></section>
  </div>
}

function Kpi({icon:Icon,title,text}:{icon:typeof Cpu,title:string,text:string}){return <div className="ns-kpi"><Icon size={20}/><b>{title}</b><span>{text}</span></div>}
