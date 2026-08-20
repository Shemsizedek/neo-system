import {useMemo, useState} from 'react'
import {Activity, AlertTriangle, Bitcoin, Boxes, Cpu, Factory, Gauge, Globe2, HardHat, Landmark, Pickaxe, PlugZap, ReceiptText, Server, ShieldCheck, Thermometer, WalletCards, Zap} from 'lucide-react'
import {contracts as seedContracts, currencies, miners} from './data'
import type {MiningContract} from './types'
import './miner.css'

const usd = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)
const num = (n:number,d=1) => n.toLocaleString('en-US',{maximumFractionDigits:d})

function Stat({label,value,sub,Icon}:{label:string;value:string;sub:string;Icon:typeof Activity}){
  return <div className="nm-card nm-stat"><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div><Icon size={22}/></div>
}

export function MinerApp(){
  const [contracts,setContracts] = useState<MiningContract[]>(seedContracts)
  const [currency,setCurrency] = useState('USD')
  const [hashrate,setHashrate] = useState('120')
  const [months,setMonths] = useState('12')
  const [customer,setCustomer] = useState('Demo Customer')

  const fleet = useMemo(()=>{
    const online = miners.filter(m=>m.status==='MINING'||m.status==='WARNING')
    const th = online.reduce((a,m)=>a+m.hashrateTh,0)
    const power = miners.reduce((a,m)=>a+m.powerW,0)
    const weightedJ = th ? power/1000*1000/th : 0
    return {online:online.length, th, power, weightedJ, warnings:miners.filter(m=>m.status==='WARNING').length, offline:miners.filter(m=>m.status==='OFFLINE').length}
  },[])

  const activeCurrency = currencies.find(c=>c.code===currency)!
  const h = Math.max(1,Number(hashrate)||1)
  const term = Math.max(1,Number(months)||1)
  const usdPrice = h * term * 4
  const estimatedBtc = h * term * 0.0000718

  const createContract = () => {
    if(!activeCurrency.payment) return
    const id = `NMC-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${String(contracts.length+1).padStart(3,'0')}`
    setContracts(v=>[{id,customer,hashrateTh:h,termMonths:term,paymentCurrency:currency,amount:currency==='BTC'?Number((usdPrice/70000).toFixed(8)):usdPrice,status:'PAYMENT_PENDING',estimatedBtc},...v])
  }

  return <div className="nm-shell">
    <aside className="nm-side">
      <div className="nm-brand"><div className="nm-mark">N</div><div><b>NEO MINER</b><span>ORIGIN • DEMO</span></div></div>
      <nav>
        {[["Command Center",Gauge],["Miners",Pickaxe],["Farms",Factory],["Facilities",Server],["Mining Pool",PlugZap],["Bitcoin",Bitcoin],["Contracts",ReceiptText],["Currencies",Globe2],["Treasury",WalletCards],["Energy",Zap],["Maintenance",HardHat],["Security",ShieldCheck]].map(([name,I],i)=>{const Icon=I as typeof Activity; return <button key={name as string} className={i===0?'active':''}><Icon size={17}/>{name as string}</button>})}
      </nav>
      <div className="nm-sidefoot"><b>POWERING THE BITCOIN ECONOMY</b><span>SHA-256 • Global payments • Smart contracts</span><a href="/">← NEO Teller</a></div>
    </aside>

    <main className="nm-main">
      <header className="nm-header"><div><p>NEO BITCOIN PRODUCTION INFRASTRUCTURE</p><h1>ORIGIN Command Center</h1></div><div className="nm-env"><i/> DEMO / SIMULATION</div></header>

      <section className="nm-stats">
        <Stat label="Fleet Hashrate" value={`${num(fleet.th)} TH/s`} sub={`${fleet.online}/${miners.length} miners contributing`} Icon={Cpu}/>
        <Stat label="Power Draw" value={`${num(fleet.power/1000)} kW`} sub={`${num(fleet.weightedJ)} J/TH observed`} Icon={Zap}/>
        <Stat label="BTC Production" value="0.004281 BTC" sub="Simulated 24h production" Icon={Bitcoin}/>
        <Stat label="Fleet Health" value={`${fleet.warnings} warning`} sub={`${fleet.offline} offline • demo telemetry`} Icon={Activity}/>
      </section>

      <section className="nm-grid">
        <div className="nm-card nm-panel">
          <div className="nm-paneltitle"><div><span>Mining Fleet</span><small>Live-style simulated telemetry</small></div><Boxes size={18}/></div>
          <div className="nm-tablewrap"><table><thead><tr><th>Miner</th><th>Facility</th><th>Hashrate</th><th>Power</th><th>Temp</th><th>J/TH</th><th>Status</th></tr></thead><tbody>{miners.map(m=><tr key={m.id}><td className="mono">{m.id}</td><td>{m.facility}</td><td>{m.hashrateTh?`${m.hashrateTh.toFixed(1)} TH/s`:'—'}</td><td>{m.powerW} W</td><td><span className={m.tempC>=75?'nm-hot':''}><Thermometer size={14}/>{m.tempC}°C</span></td><td>{m.efficiencyJTh||'—'}</td><td><span className={`nm-pill ${m.status.toLowerCase()}`}>{m.status}</span></td></tr>)}</tbody></table></div>
        </div>

        <div className="nm-card nm-panel nm-contract-builder">
          <div className="nm-paneltitle"><div><span>Mining Contract Builder</span><small>Payment → contract → hashrate allocation</small></div><ReceiptText size={18}/></div>
          <label>Customer</label><input value={customer} onChange={e=>setCustomer(e.target.value)}/>
          <div className="nm-formrow"><div><label>Hashrate (TH/s)</label><input type="number" value={hashrate} onChange={e=>setHashrate(e.target.value)}/></div><div><label>Term (months)</label><input type="number" value={months} onChange={e=>setMonths(e.target.value)}/></div></div>
          <label>Payment Currency</label><select value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option value={c.code} key={c.code}>{c.code} — {c.name} [{c.status}]</option>)}</select>
          <div className="nm-quote"><span>DEMO QUOTE</span><strong>{currency==='BTC'?`${(usdPrice/70000).toFixed(8)} BTC`:currency==='USD'?usd(usdPrice):`${usdPrice.toLocaleString()} ${currency}`}</strong><small>Reference value {usd(usdPrice)} • Estimated production {estimatedBtc.toFixed(6)} BTC</small></div>
          {!activeCurrency.payment && <div className="nm-blocked"><AlertTriangle size={17}/> Payment rail not enabled. Registry/reference only.</div>}
          <button className="nm-primary" disabled={!activeCurrency.payment} onClick={createContract}>Create payment-pending contract</button>
          <p className="nm-note">Simulation only. No funds move, no private keys are stored, and projected BTC is not guaranteed production.</p>
        </div>
      </section>

      <section className="nm-grid lower">
        <div className="nm-card nm-panel">
          <div className="nm-paneltitle"><div><span>Global Currency Matrix</span><small>World Currency reference + enabled payment rails</small></div><Globe2 size={18}/></div>
          <div className="nm-currencies">{currencies.map(c=><div className="nm-currency" key={c.code}><div><b>{c.code}</b><span>{c.name}</span></div><div className="nm-currencyflags"><em className={c.payment?'yes':'no'}>PAY {c.payment?'ON':'OFF'}</em><em className={c.settlement?'yes':'no'}>SETTLE {c.settlement?'ON':'OFF'}</em></div><small>{c.kind.replaceAll('_',' ')} • {c.status}</small></div>)}</div>
        </div>
        <div className="nm-card nm-panel">
          <div className="nm-paneltitle"><div><span>Contract Stream</span><small>Separate payment and BTC-production accounting</small></div><Landmark size={18}/></div>
          <div className="nm-contracts">{contracts.map(c=><div className="nm-contract" key={c.id}><div><b className="mono">{c.id}</b><span>{c.customer}</span></div><div><strong>{c.hashrateTh} TH/s</strong><span>{c.termMonths} months • {c.paymentCurrency}</span></div><div><strong>{c.estimatedBtc.toFixed(5)} BTC</strong><span>estimated</span></div><em className={`nm-pill ${c.status.toLowerCase()}`}>{c.status}</em></div>)}</div>
        </div>
      </section>
    </main>
  </div>
}
