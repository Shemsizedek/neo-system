import {useMemo,useState} from 'react'
import {Activity,ArrowLeft,Bitcoin,Cpu,Globe2,Layers3,ShieldCheck,Sparkles,Zap} from 'lucide-react'
import {currencies,miners} from './data'
import {canBackProduct,digitalMinerProducts,generatorSnapshot,quoteDigitalMiner,seedAllocations} from './generator'
import {canReserve,createReservation,exchangeAvailableTh,orderNotionalUsd,seedOrders,type CapacityReservation} from './exchange'
import type {DigitalMinerProduct} from './types'
import './generator.css'

const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)

export function GeneratorApp(){
  const snapshot=useMemo(()=>generatorSnapshot(miners,seedAllocations),[])
  const [currency,setCurrency]=useState('USD')
  const [selected,setSelected]=useState<DigitalMinerProduct>(digitalMinerProducts[1])
  const [customer,setCustomer]=useState('Demo Customer')
  const [reservations,setReservations]=useState<CapacityReservation[]>([])
  const quote=quoteDigitalMiner(selected,currency)
  const currencyRecord=currencies.find(c=>c.code===currency)
  const backed=canBackProduct(selected,snapshot)
  const purchasable=selected.status==='AVAILABLE'&&Boolean(currencyRecord?.payment)&&backed
  const exchangeCapacity=exchangeAvailableTh(snapshot.physicalHashrateTh,seedAllocations,reservations)

  const reserve=(orderId:string)=>{
    const order=seedOrders.find(o=>o.id===orderId)
    if(!order||!canReserve(order,exchangeCapacity))return
    setReservations(v=>[createReservation(order,customer),...v])
  }

  return <div className="ng-shell">
    <header className="ng-header"><div><a href="#/miner"><ArrowLeft size={16}/> NEO MINER</a><p>NEO BITCOIN GENERATOR v0.2</p><h1>Hashpower Exchange & Generator</h1></div><div className="ng-mode"><i/> DEMO / CONTRACT SIMULATION</div></header>

    <section className="ng-hero"><div><span>GENERATOR STATUS</span><h2>Aggregate physical SHA-256 capacity. Allocate it as verifiable digital mining contracts.</h2><p>Digital NEO Miners are service allocations backed by mining fleet capacity. Bitcoin production occurs only through actual proof-of-work delivered by connected miners and pools.</p></div><div className="ng-core"><Sparkles size={24}/><b>{snapshot.physicalHashrateTh.toFixed(1)} TH/s</b><span>physical demo fleet</span><small>{snapshot.utilizationPct.toFixed(1)}% allocated</small></div></section>

    <section className="ng-kpis"><Kpi icon={Cpu} label="Physical Hashrate" value={`${snapshot.physicalHashrateTh.toFixed(1)} TH/s`} sub="connected NEO Miner capacity"/><Kpi icon={Layers3} label="Allocated" value={`${snapshot.allocatedHashrateTh.toFixed(1)} TH/s`} sub="contracted capacity"/><Kpi icon={Zap} label="Exchange Capacity" value={`${exchangeCapacity.toFixed(1)} TH/s`} sub="available after reservations"/><Kpi icon={Activity} label="Power" value={`${snapshot.estimatedPowerKw.toFixed(1)} kW`} sub="demo fleet draw"/></section>

    <section className="ng-grid"><div className="ng-panel"><div className="ng-title"><div><span>DIGITAL NEO MINERS</span><h3>Select Hashpower</h3></div><Bitcoin size={20}/></div><div className="ng-products">{digitalMinerProducts.map(product=><button key={product.id} className={`ng-product ${selected.id===product.id?'selected':''}`} onClick={()=>setSelected(product)}><div><b>{product.tier}</b><em>{product.status}</em></div><strong>{product.allocatedHashrateTh>=1000?`${product.allocatedHashrateTh/1000} PH/s`:`${product.allocatedHashrateTh} TH/s`}</strong><span>{product.termMonths} month allocation</span><small>Reference {product.referenceEfficiencyJTh} J/TH • {money(product.basePriceUsd)}</small></button>)}</div></div>

      <div className="ng-panel ng-checkout"><div className="ng-title"><div><span>WORLD CURRENCY CONTRACT</span><h3>{selected.name}</h3></div><Globe2 size={20}/></div><label>Customer</label><input value={customer} onChange={e=>setCustomer(e.target.value)}/><label>Payment currency</label><select value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name} [{c.status}]</option>)}</select><div className="ng-quote"><div><span>Hashpower</span><strong>{selected.allocatedHashrateTh} TH/s</strong></div><div><span>Term</span><strong>{selected.termMonths} months</strong></div><div><span>Base service</span><strong>{money(quote.baseUsd)}</strong></div><div><span>Service fee</span><strong>{money(quote.serviceFeeUsd)}</strong></div><div className="total"><span>Reference total</span><strong>{money(quote.totalUsd)}</strong></div></div>{!currencyRecord?.payment&&<Notice text="This currency is registered but its payment rail is not enabled."/>}{!backed&&<Notice text="Insufficient physical hashrate to back this product. Sale remains waitlisted until capacity is connected."/>}{selected.status!=='AVAILABLE'&&<Notice text="This tier is currently waitlisted."/>}<button className="ng-buy" disabled={!purchasable}>Create payment-pending mining contract</button><p className="ng-disclaimer">{quote.disclaimer} Demonstration/reference values only until live pool, payment, FX, compliance, and settlement providers are connected.</p></div></section>

    <section className="ng-panel ng-exchange"><div className="ng-title"><div><span>HASHPOWER EXCHANGE</span><h3>Contract-backed order book</h3></div><Layers3 size={20}/></div><div className="ng-exchange-head"><div><span>Available capacity</span><strong>{exchangeCapacity.toFixed(1)} TH/s</strong></div><div><span>Active reservations</span><strong>{reservations.filter(r=>r.status==='ACTIVE').length}</strong></div></div><div className="ng-orderbook">{seedOrders.map(o=><div className="ng-order" key={o.id}><div><b>{o.side}</b><span>{o.id}</span></div><div><strong>{o.hashrateTh} TH/s</strong><span>{o.termMonths} months</span></div><div><strong>{money(o.priceUsdPerThMonth)}/TH-mo</strong><span>{money(orderNotionalUsd(o))} notional</span></div><div><strong>{o.slaPct}% SLA</strong><span>{o.backing}</span></div><button disabled={!canReserve(o,exchangeCapacity)} onClick={()=>reserve(o.id)}>{o.side==='ASK'?'Reserve':'Bid'}</button></div>)}</div>{reservations.length>0&&<div className="ng-reservations"><h4>Capacity Reservations</h4>{reservations.map(r=><div key={r.id}><b>{r.customer}</b><span>{r.hashrateTh} TH/s • {r.orderId}</span><em>ACTIVE • expires {new Date(r.expiresAt).toLocaleTimeString()}</em></div>)}</div>}</section>

    <section className="ng-panel ng-architecture"><div className="ng-title"><div><span>GENERATOR PIPELINE</span><h3>Proof-of-Work Backing</h3></div><ShieldCheck size={20}/></div><div className="ng-flow"><b>World Currency Payment</b><i>→</i><b>Exchange Order</b><i>→</i><b>Capacity Reservation</b><i>→</i><b>Mining Contract</b><i>→</i><b>NEO Miner Fleet</b><i>→</i><b>Stratum V2 / Pool</b><i>→</i><b>BTC Production Ledger</b></div><p>Every filled order must resolve to source miner IDs, delivered hashrate, pool/share records, SLA performance, and production accounting. Unbacked capacity remains blocked.</p></section>
  </div>
}

function Kpi({icon:Icon,label,value,sub}:{icon:typeof Cpu,label:string,value:string,sub:string}){return <div className="ng-kpi"><Icon size={20}/><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function Notice({text}:{text:string}){return <div className="ng-notice">{text}</div>}
