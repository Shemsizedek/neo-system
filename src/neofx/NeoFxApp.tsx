import {useEffect,useMemo,useState} from 'react'
import {Banknote,Coins,ExternalLink,RefreshCw,Search,ShieldCheck} from 'lucide-react'
import {loadNeoFxTreasuryRegistry,NEO_TREASURY_WALLET,WORLD_CURRENCY_REFERENCE,type NeoFxTreasuryAsset} from './treasuryRegistry'

type FeedQuote={pair:string;mid?:number|null;last?:number|null;timestamp?:string;source?:string;status?:string;confidence?:string}
type FeedResponse={quotes?:FeedQuote[];generatedAt?:string;errors?:Record<string,string|null>}
export function NeoFxApp(){
  const[assets,setAssets]=useState<NeoFxTreasuryAsset[]>([])
  const[query,setQuery]=useState('')
  const[state,setState]=useState<'loading'|'live'|'degraded'>('loading')
  const[sources,setSources]=useState({counterparty:false,tokenScan:false})
  const[observedAt,setObservedAt]=useState('')
  const[refreshKey,setRefreshKey]=useState(0)
  const[feedQuotes,setFeedQuotes]=useState<FeedQuote[]>([])
  const[feedStatus,setFeedStatus]=useState<'loading'|'available'|'unavailable'>('loading')
  const[feedAt,setFeedAt]=useState('')
  useEffect(()=>{
    let cancelled=false
    const controller=new AbortController()
    const timer=setTimeout(()=>controller.abort(),9000)
    setFeedStatus('loading')
    fetch('/api/markets/tickers?market=fx',{signal:controller.signal,headers:{accept:'application/json'}})
      .then(async response=>{if(!response.ok)throw new Error('feed_http_unavailable');return response.json() as Promise<FeedResponse>})
      .then(payload=>{
        if(cancelled)return
        const valid=(Array.isArray(payload.quotes)?payload.quotes:[]).filter(quote=>
          typeof quote.pair==='string'&&typeof quote.source==='string'&&
          (quote.mid==null||(Number.isFinite(quote.mid)&&quote.mid>0))&&
          (quote.last==null||(Number.isFinite(quote.last)&&quote.last>0)))
        setFeedQuotes(valid);setFeedAt(payload.generatedAt||'')
        setFeedStatus(valid.some(quote=>quote.status!=='unavailable'&&(quote.mid||quote.last))?'available':'unavailable')
      })
      .catch(()=>{if(!cancelled){setFeedQuotes([]);setFeedStatus('unavailable')}})
      .finally(()=>clearTimeout(timer))
    return()=>{cancelled=true;controller.abort();clearTimeout(timer)}
  },[refreshKey])

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


    <section aria-label="Market reference feeds" style={{padding:20,marginTop:24,border:'1px solid #35734b',borderRadius:12,background:'#10271e',color:'#eef9ef'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div><small>NEO FX · GLOBAL MARKET DATA</small><h2 style={{margin:'5px 0'}}>Reference Market Watch</h2></div>
        <strong>{feedStatus==='loading'?'CONNECTING':feedStatus==='available'?'SOURCE DATA RECEIVED':'FEED UNAVAILABLE'}</strong>
      </div>
      <p style={{fontSize:13}}>Read-only reference data. Prices are not broker-executable bids or offers. A live endpoint must be deployed on this host for quotes to appear.</p>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',textAlign:'left',borderCollapse:'collapse',fontSize:13}}>
          <thead><tr><th>PAIR</th><th>REFERENCE PRICE</th><th>SOURCE</th><th>CLASSIFICATION</th></tr></thead>
          <tbody>{feedQuotes.map(q=><tr key={q.pair} style={{borderTop:'1px solid #33523b'}}>
            <td style={{padding:'10px 3px'}}>{q.pair}</td>
            <td>{q.status==='unavailable'||!(q.mid||q.last)?'Unavailable':String(q.mid||q.last)}</td>
            <td>{q.source}</td>
            <td>{q.confidence||'reference'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {!feedQuotes.length&&<p>Reference quotes are unavailable. No simulated prices are substituted.</p>}
      <small>Feed response time: {feedAt||'Not available'} · Refresh using the Refresh Treasury control above</small>
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

    <section aria-label="Global multi-broker connectivity" style={{marginTop:24,padding:20,border:'1px solid #367553',borderRadius:12,background:'#10271e',color:'#e4faeb'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}>
        <div><small style={{letterSpacing:2,color:'#9ddec0'}}>NEO FX GLOBAL BROKER NETWORK</small><h2 style={{margin:'6px 0'}}>Multi-Broker Account Gateway</h2><p style={{margin:0}}>One workstation. Separately authorized regional broker accounts.</p></div>
        <strong style={{color:'#ffd18b'}}>READ-ONLY PLANNING · EXECUTION DISABLED</strong>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:12,marginTop:18}}>
        {[
          {name:'Interactive Brokers',markets:'Global multi-asset securities',mode:'Adapter planned'},
          {name:'OANDA',markets:'FX and regional products',mode:'Adapter planned'},
          {name:'MetaTrader broker',markets:'MT4 / MT5 broker-specific accounts',mode:'Adapter planned'},
          {name:'NEO Counterparty',markets:'BTC, XCP and verified assets',mode:'Separate wallet authorization'}
        ].map(provider=><article key={provider.name} style={{padding:14,borderRadius:8,background:'#193829',border:'1px solid #32654b'}}>
          <strong>{provider.name}</strong><p style={{fontSize:13,margin:'8px 0',opacity:.85}}>{provider.markets}</p><small style={{color:'#ffd18b'}}>{provider.mode}</small>
        </article>)}
      </div>
      <p style={{marginBottom:0,marginTop:15,fontSize:13}}>No broker credentials or accounts are connected. Regional onboarding, KYC, licensed market data, permitted products, and account-specific risk approval are mandatory before live routing. Treasury assets shown above are not brokerage balances.</p>
    </section>
  </main>
}
