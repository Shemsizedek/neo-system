import {useEffect,useState} from 'react'
import {Bitcoin,RefreshCw,Search,ExternalLink,ChevronDown} from 'lucide-react'
import {CounterpartyV2MarketAdapter} from './counterpartyAdapter'
import type {CounterpartyAssetInfo} from './counterpartyAdapter'
import type {MarketQuote} from './marketAdapters'
import {CounterpartyHealthPanel} from './CounterpartyHealthPanel'
import {XChainPanel} from './XChainPanel'

const assetPattern=/^[A-Z0-9._-]{1,32}$/
const format=(n?:number)=>n==null?'Not available':n.toLocaleString(undefined,{maximumFractionDigits:8})
type Lookup={asset:CounterpartyAssetInfo|null;quote:MarketQuote|null;error:string|null;observedAt:string}
export function NeoExplorer(){
  const [draft,setDraft]=useState('NOMNI')
  const [asset,setAsset]=useState('NOMNI')
  const [revision,setRevision]=useState(0)
  const [loading,setLoading]=useState(true)
  const [lookup,setLookup]=useState<Lookup|null>(null)
  const [showTestnet,setShowTestnet]=useState(false)
  useEffect(()=>{
    let active=true
    const api=new CounterpartyV2MarketAdapter()
    setLoading(true)
    Promise.allSettled([api.getAssetInfo(asset),api.getQuote(`${asset}/XCP`)]).then(([info,quote])=>{
      if(!active)return
      const error=info.status==='rejected'&&quote.status==='rejected'?'Counterparty API could not be reached. Try again shortly.':null
      setLookup({asset:info.status==='fulfilled'?info.value:null,quote:quote.status==='fulfilled'?quote.value:null,error,observedAt:new Date().toISOString()})
      setLoading(false)
    })
    return()=>{active=false}
  },[asset,revision])
  const submit=(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    const value=draft.trim().toUpperCase()
    if(assetPattern.test(value)){setDraft(value);setAsset(value);setRevision(r=>r+1)}
  }
  return <main className="neo-explorer neo-simple" id="main-content">
    <header className="neo-simple-header">
      <div className="neo-simple-brand"><Bitcoin size={24} aria-hidden="true"/><span>NEO <b>Explorer</b></span></div>
      <span className="neo-network-label">Bitcoin mainnet · Counterparty</span>
    </header>
    <section className="neo-simple-intro">
      <p className="neo-eyebrow">BITCOIN + COUNTERPARTY</p>
      <h1>Explore Bitcoin assets. Simply.</h1>
      <p>Look up a Counterparty asset, inspect its public information, and check network health. Read-only and non-custodial.</p>
      <form onSubmit={submit} className="neo-simple-search">
        <label htmlFor="neo-asset">Counterparty asset name</label>
        <div><Search size={20} aria-hidden="true"/><input id="neo-asset" value={draft} onChange={e=>setDraft(e.target.value.toUpperCase())} pattern="[A-Za-z0-9._-]{1,32}" maxLength={32} placeholder="Example: XCP or NOMNI" required autoComplete="off"/><button type="submit">Search</button></div>
      </form>
      <div className="neo-suggestions"><span>Try</span>{['XCP','NOMNI'].map(name=><button key={name} type="button" onClick={()=>{setDraft(name);setAsset(name);setRevision(r=>r+1)}} aria-pressed={asset===name}>{name}</button>)}</div>
    </section>
    <section className="neo-simple-results" aria-labelledby="neo-asset-heading" aria-busy={loading}>
      <div className="neo-simple-section-title"><div><p className="neo-eyebrow">COUNTERPARTY ASSET</p><h2 id="neo-asset-heading">{asset}</h2></div><button type="button" onClick={()=>setRevision(r=>r+1)} className="neo-refresh"><RefreshCw size={16} aria-hidden="true"/> Refresh</button></div>
      {loading?<p role="status">Loading public Counterparty data…</p>:lookup?.error?<p role="alert">{lookup.error}</p>:<>
        {lookup?.asset?<div className="neo-simple-metrics">
          <div><span>Asset</span><strong>{lookup.asset.asset_longname||lookup.asset.asset||asset}</strong></div>
          <div><span>Supply</span><strong>{String(lookup.asset.supply_normalized??lookup.asset.supply??'Not reported')}</strong></div>
          <div><span>Divisible</span><strong>{lookup.asset.divisible===true?'Yes':lookup.asset.divisible===false?'No':'Not reported'}</strong></div>
          <div><span>Locked</span><strong>{lookup.asset.locked===true?'Yes':lookup.asset.locked===false?'No':'Not reported'}</strong></div>
        </div>:<p className="neo-simple-empty">No asset details returned. Check the asset name or try again.</p>}
        {lookup?.asset?.description&&<div className="neo-description"><h3>About this asset</h3><p>{lookup.asset.description}</p></div>}
        <div className="neo-simple-quote"><h3>Open Counterparty market · {asset}/XCP</h3><div><span>Best bid: <b>{format(lookup?.quote?.bid)} XCP</b></span><span>Best ask: <b>{format(lookup?.quote?.ask)} XCP</b></span></div><small>{lookup?.quote?'Based on attributed open-order data. Not a guaranteed execution price.':'No verified open-order quote available.'}</small></div>
        <p className="neo-simple-observed">Checked {lookup?.observedAt?new Date(lookup.observedAt).toLocaleString():'—'} · Public data may change</p>
      </>}
      <a className="neo-simple-link" href={`https://tokenscan.io/asset/${encodeURIComponent(asset)}`} target="_blank" rel="noreferrer">View asset on TokenScan <ExternalLink size={15} aria-hidden="true"/></a>
    </section>
    <section className="neo-simple-network" aria-label="Network status">
      <div className="neo-simple-section-title"><div><p className="neo-eyebrow">NETWORK STATUS</p><h2>Bitcoin + Counterparty</h2></div></div>
      <CounterpartyHealthPanel/>
    </section>
    <section className="neo-simple-testnet">
      <button type="button" className="neo-testnet-toggle" aria-expanded={showTestnet} onClick={()=>setShowTestnet(!showTestnet)}><span>Advanced: Bitcoin testnet explorer</span><ChevronDown size={18} aria-hidden="true"/></button>
      {showTestnet&&<XChainPanel/>}
    </section>
    <footer className="neo-simple-footer"><span>Powered by Bitcoin and Counterparty public data</span><span>No wallet connection · No signing · No transactions</span></footer>
  </main>
}
