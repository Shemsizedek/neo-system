import {useMemo,useState} from 'react'
import {Activity,ArrowLeft,Bitcoin,Cpu,Globe2,Layers3,RefreshCw,Router,ShieldCheck,Sparkles,WalletCards,Zap} from 'lucide-react'
import {currencies,miners} from './data'
import {canBackProduct,digitalMinerProducts,generatorSnapshot,quoteDigitalMiner,seedAllocations} from './generator'
import {canReserve,createReservation,exchangeAvailableTh,orderNotionalUsd,seedOrders,type CapacityReservation} from './exchange'
import {attributeVerifiedShares,buildAggregationPlan,createSettlementBatch,deliverySlaPct,rebalanceAllocation,settlementIsEligible} from './aggregator'
import {defaultGatewayMode,gatewaySnapshot,seedMinerAgents,seedPoolGateways,validateGatewayMode,type ShareEvent} from './liveGateway'
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

  const activeAllocation=seedAllocations[0]
  const aggregationPlan=useMemo(()=>buildAggregationPlan(activeAllocation.contractId,activeAllocation.targetHashrateTh,miners,98.5,5),[activeAllocation])
  const sla=deliverySlaPct(activeAllocation.targetHashrateTh,activeAllocation.deliveredHashrateTh)
  const demoAttribution=useMemo(()=>attributeVerifiedShares(activeAllocation.contractId,activeAllocation.id,12480,37,845000,9100000,0.0124,false),[activeAllocation])
  const demoSettlement=useMemo(()=>createSettlementBatch(activeAllocation.contractId,[demoAttribution],2,5,true),[activeAllocation,demoAttribution])
  const settlementEligible=settlementIsEligible(demoSettlement,[demoAttribution])
  const demoRebalance=useMemo(()=>rebalanceAllocation(activeAllocation,'NEO-MINER-TX-000003',miners),[activeAllocation])

  const demoShares:ShareEvent[]=[]
  const liveCheck=validateGatewayMode(defaultGatewayMode,seedMinerAgents,seedPoolGateways)
  const liveSnapshot=gatewaySnapshot(defaultGatewayMode,seedMinerAgents,seedPoolGateways,demoShares,[])

  const reserve=(orderId:string)=>{
    const order=seedOrders.find(o=>o.id===orderId)
    if(!order||!canReserve(order,exchangeCapacity))return
    setReservations(v=>[createReservation(order,customer),...v])
  }

  return <div className="ng-shell">
    <header className="ng-header"><div><a href="#/miner"><ArrowLeft size={16}/> NEO MINER</a><p>NEO BITCOIN GENERATOR v0.4</p><h1>Live Mining Gateway</h1></div><div className="ng-mode"><i/> {defaultGatewayMode}</div></header>

    <section className="ng-hero"><div><span>GENERATOR STATUS</span><h2>Aggregate physical SHA-256 capacity, verify mining work, reconcile pool payouts, and settle attributable BTC.</h2><p>The live path is intentionally disabled until authenticated miner agents and pool endpoints are configured. Simulation data remains isolated from live HashVault settlement.</p></div><div className="ng-core"><Router size={24}/><b>{liveSnapshot.mode}</b><span>live mining gateway</span><small>{liveCheck.reason}</small></div></section>

    <section className="ng-kpis"><Kpi icon={Cpu} label="Physical Hashrate" value={`${snapshot.physicalHashrateTh.toFixed(1)} TH/s`} sub="connected NEO Miner capacity"/><Kpi icon={Layers3} label="Allocated" value={`${snapshot.allocatedHashrateTh.toFixed(1)} TH/s`} sub="contracted capacity"/><Kpi icon={Zap} label="Exchange Capacity" value={`${exchangeCapacity.toFixed(1)} TH/s`} sub="available after reservations"/><Kpi icon={Activity} label="Delivery SLA" value={`${sla.toFixed(1)}%`} sub={`${activeAllocation.deliveredHashrateTh.toFixed(1)} / ${activeAllocation.targetHashrateTh} TH/s`}/></section>

    <section className="ng-grid"><div className="ng-panel"><div className="ng-title"><div><span>DIGITAL NEO MINERS</span><h3>Select Hashpower</h3></div><Bitcoin size={20}/></div><div className="ng-products">{digitalMinerProducts.map(product=><button key={product.id} className={`ng-product ${selected.id===product.id?'selected':''}`} onClick={()=>setSelected(product)}><div><b>{product.tier}</b><em>{product.status}</em></div><strong>{product.allocatedHashrateTh>=1000?`${product.allocatedHashrateTh/1000} PH/s`:`${product.allocatedHashrateTh} TH/s`}</strong><span>{product.termMonths} month allocation</span><small>Reference {product.referenceEfficiencyJTh} J/TH • {money(product.basePriceUsd)}</small></button>)}</div></div>

      <div className="ng-panel ng-checkout"><div className="ng-title"><div><span>WORLD CURRENCY CONTRACT</span><h3>{selected.name}</h3></div><Globe2 size={20}/></div><label>Customer</label><input value={customer} onChange={e=>setCustomer(e.target.value)}/><label>Payment currency</label><select value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name} [{c.status}]</option>)}</select><div className="ng-quote"><div><span>Hashpower</span><strong>{selected.allocatedHashrateTh} TH/s</strong></div><div><span>Term</span><strong>{selected.termMonths} months</strong></div><div><span>Base service</span><strong>{money(quote.baseUsd)}</strong></div><div><span>Service fee</span><strong>{money(quote.serviceFeeUsd)}</strong></div><div className="total"><span>Reference total</span><strong>{money(quote.totalUsd)}</strong></div></div>{!currencyRecord?.payment&&<Notice text="This currency is registered but its payment rail is not enabled."/>}{!backed&&<Notice text="Insufficient physical hashrate to back this product. Sale remains waitlisted until capacity is connected."/>}{selected.status!=='AVAILABLE'&&<Notice text="This tier is currently waitlisted."/>}<button className="ng-buy" disabled={!purchasable}>Create payment-pending mining contract</button><p className="ng-disclaimer">{quote.disclaimer} Demonstration/reference values only until live pool, payment, FX, compliance, and settlement providers are connected.</p></div></section>

    <section className="ng-panel ng-exchange"><div className="ng-title"><div><span>HASHPOWER EXCHANGE</span><h3>Contract-backed order book</h3></div><Layers3 size={20}/></div><div className="ng-exchange-head"><div><span>Available capacity</span><strong>{exchangeCapacity.toFixed(1)} TH/s</strong></div><div><span>Active reservations</span><strong>{reservations.filter(r=>r.status==='ACTIVE').length}</strong></div></div><div className="ng-orderbook">{seedOrders.map(o=><div className="ng-order" key={o.id}><div><b>{o.side}</b><span>{o.id}</span></div><div><strong>{o.hashrateTh} TH/s</strong><span>{o.termMonths} months</span></div><div><strong>{money(o.priceUsdPerThMonth)}/TH-mo</strong><span>{money(orderNotionalUsd(o))} notional</span></div><div><strong>{o.slaPct}% SLA</strong><span>{o.backing}</span></div><button disabled={!canReserve(o,exchangeCapacity)} onClick={()=>reserve(o.id)}>{o.side==='ASK'?'Reserve':'Bid'}</button></div>)}</div>{reservations.length>0&&<div className="ng-reservations"><h4>Capacity Reservations</h4>{reservations.map(r=><div key={r.id}><b>{r.customer}</b><span>{r.hashrateTh} TH/s • {r.orderId}</span><em>ACTIVE • expires {new Date(r.expiresAt).toLocaleTimeString()}</em></div>)}</div>}</section>

    <section className="ng-grid">
      <div className="ng-panel"><div className="ng-title"><div><span>DYNAMIC AGGREGATOR</span><h3>{aggregationPlan.state}</h3></div><RefreshCw size={20}/></div><div className="ng-quote"><div><span>Target</span><strong>{aggregationPlan.targetHashrateTh.toFixed(1)} TH/s</strong></div><div><span>Assigned</span><strong>{aggregationPlan.assignedHashrateTh.toFixed(1)} TH/s</strong></div><div><span>Reserve</span><strong>{aggregationPlan.reserveHashrateTh.toFixed(1)} TH/s</strong></div><div><span>SLA target</span><strong>{aggregationPlan.slaTargetPct}%</strong></div></div><div className="ng-reservations"><h4>Source Miners</h4>{aggregationPlan.contributions.filter(c=>c.assignedHashrateTh>0).map(c=><div key={c.minerId}><b>{c.minerId}</b><span>{c.assignedHashrateTh.toFixed(1)} TH/s assigned</span><em>Health {c.healthScore.toFixed(1)}</em></div>)}</div><p className="ng-disclaimer">Demo rebalance: {demoRebalance.failedMinerId} → {demoRebalance.replacementMinerId||'NO CAPACITY'} • {demoRebalance.status}</p></div>

      <div className="ng-panel"><div className="ng-title"><div><span>BTC ATTRIBUTION & HASHVAULT</span><h3>Settlement Gate</h3></div><WalletCards size={20}/></div><div className="ng-quote"><div><span>Share status</span><strong>{demoAttribution.status}</strong></div><div><span>Attributed BTC</span><strong>{demoAttribution.attributedBtc.toFixed(8)} BTC</strong></div><div><span>Pool fee</span><strong>{demoSettlement.poolFeeBtc.toFixed(8)} BTC</strong></div><div><span>Service fee</span><strong>{demoSettlement.serviceFeeBtc.toFixed(8)} BTC</strong></div><div className="total"><span>Net HashVault credit</span><strong>{demoSettlement.netBtc.toFixed(8)} BTC</strong></div></div><Notice text={settlementEligible?'Settlement is eligible for approval.':'Settlement blocked: attribution is estimated and/or the batch is still simulation data.'}/><button className="ng-buy" disabled={!settlementEligible}>Approve HashVault settlement</button></div>
    </section>

    <section className="ng-panel"><div className="ng-title"><div><span>LIVE MINING GATEWAY</span><h3>Authenticated Agent & Pool Bridge</h3></div><Router size={20}/></div><div className="ng-exchange-head"><div><span>Miner agents</span><strong>{liveSnapshot.connectedAgents}/{liveSnapshot.minerAgents}</strong></div><div><span>Pool gateways</span><strong>{liveSnapshot.connectedPools}/{liveSnapshot.poolGateways}</strong></div><div><span>Verified shares</span><strong>{liveSnapshot.verifiedShares}</strong></div><div><span>Verified payouts</span><strong>{liveSnapshot.verifiedPayouts}</strong></div></div><Notice text={`Live readiness: ${liveCheck.ready?'READY':'BLOCKED'} — ${liveCheck.reason}`}/><div className="ng-reservations"><h4>Miner Agents</h4>{seedMinerAgents.map(a=><div key={a.id}><b>{a.minerId}</b><span>{a.status} • TLS {a.tlsRequired?'REQUIRED':'OFF'}</span><em>{a.enabled?'ENABLED':'DISABLED'}</em></div>)}</div><div className="ng-reservations"><h4>Pool Gateways</h4>{seedPoolGateways.map(p=><div key={p.id}><b>{p.poolName}</b><span>{p.protocol} • {p.status}</span><em>{p.enabled?'ENABLED':'DISABLED'}</em></div>)}</div><p className="ng-disclaimer">Private keys, API secrets, miner credentials, and pool authentication material must remain in secure server-side secret storage. They are not stored in these client-visible configuration records.</p></section>

    <section className="ng-panel ng-architecture"><div className="ng-title"><div><span>GENERATOR PIPELINE</span><h3>Live Proof-of-Work & Settlement</h3></div><ShieldCheck size={20}/></div><div className="ng-flow"><b>World Currency Payment</b><i>→</i><b>Hashpower Contract</b><i>→</i><b>Dynamic Aggregator</b><i>→</i><b>Authenticated Miner Agents</b><i>→</i><b>Stratum Pool Gateway</b><i>→</i><b>Verified Share Events</b><i>→</i><b>Pool Payout Reconciliation</b><i>→</i><b>HashVault Settlement</b></div><p>Live settlement requires authenticated source miners, verified share events, a reconciled pool payout, auditable fee calculations, and non-simulation settlement records. The application must fail closed whenever those requirements are missing.</p></section>
  </div>
}

function Kpi({icon:Icon,label,value,sub}:{icon:typeof Cpu,label:string,value:string,sub:string}){return <div className="ng-kpi"><Icon size={20}/><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function Notice({text}:{text:string}){return <div className="ng-notice">{text}</div>}
