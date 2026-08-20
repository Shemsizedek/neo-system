import {useMemo,useState} from 'react'
import {
  Activity, AlertTriangle, Banknote, Bitcoin, BookOpen, BriefcaseBusiness,
  Building2, CircleDollarSign, FileText, Gauge, Gavel, HeartHandshake,
  Landmark, Network, RefreshCw, Scale, Shield, ShieldCheck, Users, WalletCards
} from 'lucide-react'
import {tellers,txs as seedTxs} from './mock'
import type {Transaction} from './types'
import {foundationalPrinciples,neoModules} from './neoSystem'

const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)

const iconMap: Record<string, typeof Activity> = {
  executive: BriefcaseBusiness,
  tribunal: Gavel,
  corpus: BookOpen,
  chaplaincy: FileText,
  treasury: WalletCards,
  police: ShieldCheck,
  marshals: Scale,
  guards: Shield,
  defense: Building2,
}

function Stat({label,value,sub,Icon}:{label:string;value:string;sub:string;Icon:typeof Activity}){
  return <div className="card stat"><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div><Icon size={22}/></div>
}

export function App(){
  const[txs,setTxs]=useState<Transaction[]>(seedTxs)
  const[amount,setAmount]=useState('250')
  const[active,setActive]=useState('overview')
  const totals=useMemo(()=>({
    cash:tellers.reduce((a,t)=>a+t.cashUsd,0),
    btc:tellers.reduce((a,t)=>a+t.btc,0),
    xcp:tellers.reduce((a,t)=>a+t.xcp,0),
    online:tellers.filter(t=>t.status==='ONLINE').length
  }),[])
  const simulate=()=>{
    const n=Math.max(1,Number(amount)||1)
    const id=`ETHA-${Math.random().toString(16).slice(2,8).toUpperCase()}`
    setTxs(v=>[{id,tellerId:'NT-000001',type:'BUY BTC',source:'USD',destination:'BTC',amount:n,fiatValue:n,status:'AUTHORIZED',risk:9,createdAt:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})},...v])
  }
  return <div className="shell">
    <aside className="side">
      <div className="brand"><div className="mark">N</div><div><b>NEO SYSTEM</b><span>FOUNDATION • v0.1</span></div></div>
      <nav>
        <button className={active==='overview'?'active':''} onClick={()=>setActive('overview')}><Gauge size={17}/>System Overview</button>
        <button className={active==='treasury'?'active':''} onClick={()=>setActive('treasury')}><Landmark size={17}/>Treasury / Teller</button>
        <button className={active==='tribunal'?'active':''} onClick={()=>setActive('tribunal')}><Gavel size={17}/>Tribunal</button>
        <button className={active==='corpus'?'active':''} onClick={()=>setActive('corpus')}><BookOpen size={17}/>Legal Corpus</button>
        <button className={active==='security'?'active':''} onClick={()=>setActive('security')}><Shield size={17}/>Global Arms</button>
      </nav>
      <div className="sidefoot">Love • Truth • Peace<br/>Freedom • Justice</div>
    </aside>
    <main>
      <header><div><p>NEW ETHEREAL ORDER • DIGITAL CONTROL PLANE</p><h1>{active==='overview'?'NEO System Command Center':active==='treasury'?'Treasury & Teller Sandbox':active==='tribunal'?'Inner Bar Temple Tribunal':active==='corpus'?'Noocratic Legal Corpus':'Global Protection Systems'}</h1></div><div className="env"><i/> FOUNDATION</div></header>

      {active==='overview' && <>
        <section className="principles">{foundationalPrinciples.map(p=><span key={p}>{p}</span>)}</section>
        <section className="stats">
          <Stat label="System Modules" value={`${neoModules.length}`} sub="Integrated domains" Icon={Network}/>
          <Stat label="Tribunal" value="READY" sub="Case-review foundation" Icon={Gavel}/>
          <Stat label="Legal Corpus" value="ACTIVE" sub="Immutable source model" Icon={BookOpen}/>
          <Stat label="Treasury" value="SANDBOX" sub="NEO Teller preserved" Icon={Landmark}/>
        </section>
        <section className="modulegrid">{neoModules.map(m=>{const Icon=iconMap[m.id]||Activity;return <article className="card module" key={m.id}><div className="modulehead"><Icon size={20}/><span className={'status '+m.status.toLowerCase()}>{m.status}</span></div><h2>{m.name}</h2><p className="domain">{m.domain}</p><p>{m.description}</p><div className="boundary"><ShieldCheck size={14}/><span>{m.boundary}</span></div></article>})}</section>
      </>}

      {active==='treasury' && <>
        <section className="stats"><Stat label="Network Cash" value={money(totals.cash)} sub="4 machine reserves" Icon={Banknote}/><Stat label="BTC Reserve" value={`${totals.btc.toFixed(4)} BTC`} sub="Operational liquidity" Icon={Bitcoin}/><Stat label="XCP Reserve" value={`${totals.xcp.toLocaleString()} XCP`} sub="Counterparty layer" Icon={CircleDollarSign}/><Stat label="Active Tellers" value={`${totals.online}/${tellers.length}`} sub="Sandbox availability" Icon={Activity}/></section>
        <section className="grid"><div className="card panel"><div className="paneltitle"><div><span>ETHA Teller Simulator</span><small>All operations remain simulated</small></div><RefreshCw size={18}/></div><label>Amount (USD)</label><div className="amount"><span>$</span><input value={amount} onChange={e=>setAmount(e.target.value)}/></div><div className="route"><span>ROUTE</span><b>NEO Teller → ETHA → Bitcoin / XCP</b></div><button className="primary" onClick={simulate}>Authorize simulated transaction</button></div><div className="card panel"><div className="paneltitle"><div><span>Network Health</span><small>Machine heartbeat and reserves</small></div><Network size={18}/></div><div className="machines">{tellers.map(t=><div className="machine" key={t.id}><div><b>{t.id}</b><span>{t.city}</span></div><div className="reserve"><b>{money(t.cashUsd)}</b><span>{t.btc.toFixed(3)} BTC</span></div><em className={t.status.toLowerCase()}>{t.status}</em></div>)}</div></div></section>
        <section className="card tablecard"><div className="paneltitle"><div><span>ETHA Transaction Stream</span><small>Authorization, settlement and risk state</small></div><AlertTriangle size={18}/></div><div className="tablewrap"><table><thead><tr><th>ID</th><th>Teller</th><th>Type</th><th>Route</th><th>Value</th><th>Risk</th><th>Status</th></tr></thead><tbody>{txs.map(t=><tr key={t.id}><td className="mono">{t.id}</td><td>{t.tellerId}</td><td>{t.type}</td><td>{t.source} → {t.destination}</td><td>{money(t.fiatValue)}</td><td>{t.risk}</td><td><span className={'pill '+t.status.toLowerCase()}>{t.status}</span></td></tr>)}</tbody></table></div></section>
      </>}

      {active==='tribunal' && <section className="focusgrid"><div className="card focus"><Gavel size={26}/><h2>Case Review Pipeline</h2><p>E-File → docket → jurisdiction review → notice → evidence → record close → NEOsync final opinion → authorized disposition.</p><ul><li>Full-record review standard</li><li>Fact / allegation / evidence separation</li><li>Temple and external authority layers</li><li>Immutable audit trail</li></ul></div><div className="card focus"><HeartHandshake size={26}/><h2>Due Process Boundary</h2><p>The software records and analyzes internal proceedings. It does not impersonate a governmental court or create external jurisdiction by software declaration.</p></div></section>}

      {active==='corpus' && <section className="focusgrid"><div className="card focus"><BookOpen size={26}/><h2>Immutable Historical Record</h2><p>Original bulletins, letter patents, canons, resolutions and historical drafts are preserved as issued. Later interpretation is stored as a separate addendum or authority note.</p></div><div className="card focus"><FileText size={26}/><h2>Authority Classification</h2><p>Divine • Ecclesiastical • Noocratic Constitutional • Administrative • Historical • United States • International.</p></div></section>}

      {active==='security' && <section className="modulegrid">{neoModules.filter(m=>['police','marshals','guards','defense'].includes(m.id)).map(m=>{const Icon=iconMap[m.id];return <article className="card module" key={m.id}><div className="modulehead"><Icon size={22}/><span className="status foundation">FOUNDATION</span></div><h2>{m.name}</h2><p>{m.description}</p><div className="boundary"><ShieldCheck size={14}/><span>{m.boundary}</span></div></article>})}</section>}
    </main>
  </div>
}
