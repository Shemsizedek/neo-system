import {useEffect,useMemo,useState} from 'react'
import {Activity,AlertTriangle,Banknote,Bitcoin,CircleDollarSign,Network,RefreshCw,ShieldCheck} from 'lucide-react'
import {tellers,txs as seedTxs} from '../mock'
import type {Transaction} from '../types'
import {fetchTellerNetworkSnapshot,type TellerNetworkSnapshot} from './liveData'

const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)

export function TellerDashboard(){
  const[txs,setTxs]=useState<Transaction[]>(seedTxs)
  const[amount,setAmount]=useState('250')
  const[snapshot,setSnapshot]=useState<TellerNetworkSnapshot|null>(null)
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState('')
  const totals=useMemo(()=>({cash:tellers.reduce((a,t)=>a+t.cashUsd,0),btc:tellers.reduce((a,t)=>a+t.btc,0),xcp:tellers.reduce((a,t)=>a+t.xcp,0),online:tellers.filter(t=>t.status==='ONLINE').length}),[])

  const refresh=async()=>{setLoading(true);setError('');try{setSnapshot(await fetchTellerNetworkSnapshot())}catch(e){setError(e instanceof Error?e.message:'Unable to load network data')}finally{setLoading(false)}}
  useEffect(()=>{void refresh()},[])
  const simulate=()=>{const n=Math.max(1,Number(amount)||1);const id=`ETHA-${Math.random().toString(16).slice(2,8).toUpperCase()}`;setTxs(v=>[{id,tellerId:'NT-000001',type:'BUY BTC',source:'USD',destination:'BTC',amount:n,fiatValue:n,status:'AUTHORIZED',risk:9,createdAt:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})},...v])}

  return <>
    <section className="principles"><span>READ-ONLY LIVE DATA</span><span>USER-CONTROLLED SIGNING BOUNDARY</span><span>ETHA SANDBOX SETTLEMENT</span></section>
    <section className="stats">
      <div className="card stat"><div><span>Counterparty Gateway</span><strong>{snapshot?.counterparty.status??(loading?'CHECKING':'OFFLINE')}</strong><small>{snapshot?.counterparty.source??'Configurable API adapter'}</small></div><Network size={22}/></div>
      <div className="card stat"><div><span>Bitcoin Height</span><strong>{snapshot?.bitcoin.blockHeight?.toLocaleString()??'—'}</strong><small>{snapshot?.bitcoin.source??'Read-only chain source'}</small></div><Bitcoin size={22}/></div>
      <div className="card stat"><div><span>NOMNI Registry</span><strong>{snapshot?.assets.NOMNI?.status??'PENDING'}</strong><small>{snapshot?.assets.NOMNI?.issuer?'Issuer verified by source':'Asset metadata adapter'}</small></div><CircleDollarSign size={22}/></div>
      <div className="card stat"><div><span>Signing Authority</span><strong>DISABLED</strong><small>No private keys in dashboard</small></div><ShieldCheck size={22}/></div>
    </section>
    {error&&<section className="card focus"><AlertTriangle size={22}/><h2>Live-data gateway unavailable</h2><p>{error}</p><p>Sandbox operations remain available; no balances or blockchain confirmations are fabricated.</p></section>}
    <section className="grid"><div className="card panel"><div className="paneltitle"><div><span>ETHA Teller Simulator</span><small>Settlement remains simulated until signing/custody is separately approved</small></div><RefreshCw size={18}/></div><label>Amount (USD)</label><div className="amount"><span>$</span><input value={amount} onChange={e=>setAmount(e.target.value)}/></div><div className="route"><span>ROUTE</span><b>NEO Teller → ETHA → Bitcoin / Counterparty</b></div><button className="primary" onClick={simulate}>Authorize simulated transaction</button></div>
    <div className="card panel"><div className="paneltitle"><div><span>Live Network Readiness</span><small>Read-only gateway state</small></div><button className="primary" onClick={()=>void refresh()} disabled={loading}>{loading?'Refreshing…':'Refresh'}</button></div><div className="machines"><div className="machine"><div><b>Counterparty</b><span>{snapshot?.counterparty.version??'Version unavailable'}</span></div><em className={(snapshot?.counterparty.status==='ONLINE'?'online':'offline')}>{snapshot?.counterparty.status??'OFFLINE'}</em></div><div className="machine"><div><b>Bitcoin</b><span>Block {snapshot?.bitcoin.blockHeight??'—'}</span></div><em className={(snapshot?.bitcoin.status==='ONLINE'?'online':'offline')}>{snapshot?.bitcoin.status??'OFFLINE'}</em></div></div></div></section>
    <section className="stats"><div className="card stat"><div><span>Network Cash</span><strong>{money(totals.cash)}</strong><small>Sandbox machine reserves</small></div><Banknote size={22}/></div><div className="card stat"><div><span>BTC Reserve</span><strong>{totals.btc.toFixed(4)} BTC</strong><small>Sandbox operational liquidity</small></div><Bitcoin size={22}/></div><div className="card stat"><div><span>XCP Reserve</span><strong>{totals.xcp.toLocaleString()} XCP</strong><small>Sandbox Counterparty layer</small></div><CircleDollarSign size={22}/></div><div className="card stat"><div><span>Active Tellers</span><strong>{totals.online}/{tellers.length}</strong><small>Sandbox machines</small></div><Activity size={22}/></div></section>
    <section className="card tablecard"><div className="paneltitle"><div><span>ETHA Transaction Stream</span><small>Authorization only; no live funds movement</small></div><AlertTriangle size={18}/></div><div className="tablewrap"><table><thead><tr><th>ID</th><th>Teller</th><th>Type</th><th>Route</th><th>Value</th><th>Risk</th><th>Status</th></tr></thead><tbody>{txs.map(t=><tr key={t.id}><td className="mono">{t.id}</td><td>{t.tellerId}</td><td>{t.type}</td><td>{t.source} → {t.destination}</td><td>{money(t.fiatValue)}</td><td>{t.risk}</td><td><span className={'pill '+t.status.toLowerCase()}>{t.status}</span></td></tr>)}</tbody></table></div></section>
  </>
}
