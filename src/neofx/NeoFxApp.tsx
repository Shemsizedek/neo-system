import {useEffect,useMemo,useState} from 'react'
import {Banknote,Coins,ExternalLink,RefreshCw,Search,ShieldCheck} from 'lucide-react'
import {loadNeoFxTreasuryRegistry,NEO_TREASURY_WALLET,WORLD_CURRENCY_REFERENCE,type NeoFxTreasuryAsset} from './treasuryRegistry'

export function NeoFxApp(){
  const[assets,setAssets]=useState<NeoFxTreasuryAsset[]>([])
  const[query,setQuery]=useState('')
  const[state,setState]=useState<'loading'|'live'|'degraded'>('loading')
  const[sources,setSources]=useState({counterparty:false,tokenScan:false})
  const[observedAt,setObservedAt]=useState('')
  const[refreshKey,setRefreshKey]=useState(0)

  useEffect(()=>{
    let cancelled=false
    setState('loading')
    loadNeoFxTreasuryRegistry().then(result=>{
      if(cancelled)return
      setAssets(result.assets)
      setSources(result.sources)
      setObservedAt(result.observedAt)
      setState(result.assets.length?'live':'degraded')
    }).catch(()=>{if(!cancelled)setState('degraded')})
    return()=>{cancelled=true}
  },[refreshKey])

  const filtered=useMemo(()=>{
    const q=query.trim().toUpperCase()
    if(!q)return assets
    return assets.filter(asset=>`${asset.asset} ${asset.description} ${asset.classification}`.toUpperCase().includes(q))
  },[assets,query])

  const counts=useMemo(()=>({
    coinage:assets.filter(a=>a.classification==='DIGITAL_COINAGE').length,
    cash:assets.filter(a=>a.classification==='DIGITAL_FIAT_CASH').length,
    world:assets.filter(a=>a.classification==='WORLD_CURRENCY').length,
  }),[assets])

  return <main className="neofx">
    <section className="neofx-hero">
      <div><p>NEOfx • NEO TREASURY WORLD CURRENCY MARKET</p><h1>World Currencies</h1><span>Legacy finance standards • Bitcoin / Counterparty settlement • Treasury-issued currency registry</span></div>
      <button onClick={()=>setRefreshKey(v=>v+1)}><RefreshCw size={16}/> Refresh Treasury</button>
    </section>

    <section className="neofx-wallet"><div><span>TREASURY WALLET</span><b>{NEO_TREASURY_WALLET}</b><small>Valid issuances sourced by this wallet populate NEOfx supported Treasury currencies.</small></div><div className="neofx-links"><a href="#/explorer">NEOscan / Explorer</a><a href={WORLD_CURRENCY_REFERENCE} target="_blank" rel="noreferrer">World Currency Reference <ExternalLink size={13}/></a></div></section>

    <section className="neofx-stats">
      <div><span>REGISTRY</span><b>{state.toUpperCase()}</b><small>{assets.length} Treasury assets</small></div>
      <div><span>DIGITAL COINAGE</span><b>{counts.coinage}</b><small>Change / coinage classification</small></div>
      <div><span>DIGITAL FIAT CASH</span><b>{counts.cash}</b><small>Cash / deposit denomination class</small></div>
      <div><span>WORLD CURRENCY</span><b>{counts.world}</b><small>Named currency denomination class</small></div>
      <div><span>SOURCES</span><b>{sources.counterparty?'CP✓':'CP—'} • {sources.tokenScan?'NS✓':'NS—'}</b><small>{observedAt?new Date(observedAt).toLocaleString():'Waiting for live data'}</small></div>
    </section>

    <section className="neofx-doctrine">
      <article><Coins size={18}/><div><b>Coinage</b><p>Treasury-issued assets containing “coin” are classified operationally as digital coinage for change and settlement denomination inside the NEO Ecosystem.</p></div></article>
      <article><Banknote size={18}/><div><b>Cash</b><p>Treasury-issued assets containing “cash” are classified operationally as digital or cryptographic fiat-cash denominations.</p></div></article>
      <article><ShieldCheck size={18}/><div><b>Legacy standards retained</b><p>NEOfx preserves familiar finance concepts while keeping token classification separate from off-chain legal status, which remains evidence-dependent.</p></div></article>
    </section>

    <section className="neofx-market">
      <div className="neofx-market-head"><div><span>NEOfx SUPPORTED CURRENCIES</span><h2>Treasury Issuance Registry</h2></div><label><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search currency or classification"/></label></div>
      <div className="neofx-table"><div className="neofx-row neofx-row-head"><span>ASSET</span><span>CLASS</span><span>ROLE</span><span>QUANTITY</span><span>PROVENANCE</span></div>{filtered.map(asset=><button className="neofx-row" key={asset.asset} onClick={()=>window.location.hash=`/explorer/${asset.asset}`}><b>{asset.asset}</b><span>{asset.classification.replaceAll('_',' ')}</span><span>{asset.settlementRole}</span><span>{String(asset.quantity??'—')}</span><span>{asset.blockIndex?`BLOCK ${asset.blockIndex}`:'TREASURY ISSUANCE'}</span></button>)}</div>
      {!filtered.length&&<p className="neofx-empty">{state==='loading'?'Loading Treasury issuance history…':'No Treasury currencies match this search.'}</p>}
    </section>
  </main>
}
