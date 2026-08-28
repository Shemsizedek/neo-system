import {useCallback,useEffect,useMemo,useState} from 'react'
import {Activity,Bitcoin,BookOpen,ExternalLink,Globe2,RefreshCw,Search,Sparkles,WalletCards} from 'lucide-react'
import {analyzeExplorerMarket} from './neoAlgoAdapter'
import type {MarketObservation} from './neoAlgoAdapter'
import {CounterpartyV2MarketAdapter} from './counterpartyAdapter'
import {TokenScanMarketAdapter} from './tokenScanAdapter'
import type {CounterpartyAssetInfo,CounterpartyBalance,CounterpartyIssuance} from './counterpartyAdapter'
import {getOrangeChipVerification} from './orangeChipVerification'
import type {OrangeChipEvidenceRecord} from './orangeChipEvidence'
import {EvidenceVaultApi} from './evidenceVaultApi'
import {assessPersistentEvidence} from './evidenceVaultAssessment'
import type {MarketQuote} from './marketAdapters'

const CENTRAL_LISTING_WALLET='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'
const QUOTE_ASSET='XCP'
const modelAsks=[['0.000084','1,250,000','105.00'],['0.000082','800,000','65.60'],['0.000080','600,000','48.00'],['0.000078','450,000','35.10']]
const modelBids=[['0.000076','700,000','53.20'],['0.000074','1,100,000','81.40'],['0.000072','900,000','64.80'],['0.000070','1,500,000','105.00']]
const formatPrice=(value?:number)=>value==null?'—':value.toLocaleString(undefined,{maximumFractionDigits:8})
const formatCount=(value:number)=>value.toLocaleString()
const balanceValue=(balance?:CounterpartyBalance)=>String(balance?.quantity_normalized??balance?.quantity??'—')
const issuanceQuantity=(issuance?:CounterpartyIssuance)=>String(issuance?.quantity_normalized??issuance?.quantity??'—')
const shortTime=(value?:string)=>value?new Date(value).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'

function issuedOrangeChipStocks(issuances:CounterpartyIssuance[]){
  const byAsset=new Map<string,CounterpartyIssuance>()
  for(const issuance of issuances){
    const source=(issuance.source??issuance.issuer??'').trim()
    if(!issuance.asset||source!==CENTRAL_LISTING_WALLET)continue
    const status=(issuance.status??'valid').toLowerCase()
    if(status&&status!=='valid')continue
    if(!byAsset.has(issuance.asset))byAsset.set(issuance.asset,issuance)
  }
  return [...byAsset.values()].sort((a,b)=>(a.asset??'').localeCompare(b.asset??''))
}

function bestBid(quotes:MarketQuote[]){return quotes.filter(q=>q.bid!=null).sort((a,b)=>(b.bid??0)-(a.bid??0))[0]}
function bestAsk(quotes:MarketQuote[]){return quotes.filter(q=>q.ask!=null).sort((a,b)=>(a.ask??Infinity)-(b.ask??Infinity))[0]}

export function NeoExplorer(){
  const [selectedAsset,setSelectedAsset]=useState('NOMNI')
  const [search,setSearch]=useState('')
  const [refreshKey,setRefreshKey]=useState(0)
  const pair=`${selectedAsset}/${QUOTE_ASSET}`
  const [foundationBalances,setFoundationBalances]=useState<CounterpartyBalance[]>([])
  const [stockIssuances,setStockIssuances]=useState<CounterpartyIssuance[]>([])
  const [assetInfo,setAssetInfo]=useState<CounterpartyAssetInfo|null>(null)
  const [observations,setObservations]=useState<MarketObservation[]>([])
  const [marketQuotes,setMarketQuotes]=useState<MarketQuote[]>([])
  const [feedState,setFeedState]=useState<'loading'|'live'|'degraded'>('loading')
  const [holderCount,setHolderCount]=useState<number|null>(null)
  const [dispenserCount,setDispenserCount]=useState<number|null>(null)
  const [vaultEvidence,setVaultEvidence]=useState<OrangeChipEvidenceRecord[]>([])
  const [vaultState,setVaultState]=useState<'loading'|'live'|'unconfigured'|'degraded'>('loading')
  const [observedAt,setObservedAt]=useState<string>()

  const refresh=useCallback(()=>setRefreshKey(key=>key+1),[])

  useEffect(()=>{
    let cancelled=false
    const counterparty=new CounterpartyV2MarketAdapter()
    const tokenScan=new TokenScanMarketAdapter()
    setFeedState('loading')
    Promise.allSettled([counterparty.snapshot(pair,CENTRAL_LISTING_WALLET),tokenScan.getQuote(pair)]).then(results=>{
      if(cancelled)return
      const snapshot=results[0].status==='fulfilled'?results[0].value:null
      const tokenQuote=results[1].status==='fulfilled'?results[1].value:null
      const nextQuotes:MarketQuote[]=[]
      const nextObservations:MarketObservation[]=[]
      if(snapshot){
        const stocks=issuedOrangeChipStocks(snapshot.issuances)
        setFoundationBalances(snapshot.balances)
        setStockIssuances(stocks)
        if(!stocks.some(issuance=>issuance.asset===selectedAsset)&&stocks.length)setSelectedAsset(stocks[0].asset??'NOMNI')
        setAssetInfo(snapshot.assetInfo)
        setHolderCount(snapshot.holders.length)
        setDispenserCount(snapshot.dispensers.length)
        if(snapshot.quote)nextQuotes.push(snapshot.quote)
        nextObservations.push({venue:'XCP_DEX',source:snapshot.quote?.source??'Counterparty v2',status:snapshot.quote?'verified':'reported',note:snapshot.quote?'Counterparty order data loaded successfully.':'Counterparty responded, but no open XCP quote was found.',quote:snapshot.quote})
        setObservedAt(snapshot.observedAt)
      }else{
        nextObservations.push({venue:'XCP_DEX',source:'Counterparty v2',status:'unavailable',note:'Counterparty feed unavailable.'})
      }
      if(tokenQuote){
        nextQuotes.push(tokenQuote)
        nextObservations.push({venue:'EXTERNAL',source:'TokenScan',status:'verified',note:'TokenScan market/order-book history loaded as a separate attributed source.',quote:tokenQuote})
      }else{
        nextObservations.push({venue:'EXTERNAL',source:'TokenScan',status:'unavailable',note:'TokenScan returned no verified quote for this pair.'})
      }
      nextObservations.push({venue:'CES',source:'Community Exchange System',status:'unavailable',note:'Authorized CES runtime configuration is not connected to this browser session.'})
      nextObservations.push({venue:'NEO_DEX',source:'NEO DEX interface model',status:'illustrative',note:'Fallback rows are UI fixtures and are not treated as live price evidence.'})
      setMarketQuotes(nextQuotes)
      setObservations(nextObservations)
      setFeedState(snapshot||tokenQuote?'live':'degraded')
    }).catch(()=>{if(!cancelled)setFeedState('degraded')})
    return()=>{cancelled=true}
  },[pair,selectedAsset,refreshKey])

  useEffect(()=>{
    let cancelled=false
    setVaultState('loading')
    const api=new EvidenceVaultApi()
    api.list(selectedAsset).then(records=>{if(cancelled)return;setVaultEvidence(records);setVaultState('live')}).catch(error=>{
      if(cancelled)return
      setVaultEvidence([])
      setVaultState(error instanceof Error&&error.message.includes('not configured')?'unconfigured':'degraded')
    })
    return()=>{cancelled=true}
  },[selectedAsset,refreshKey])

  const algo=useMemo(()=>analyzeExplorerMarket(pair,observations),[pair,observations])
  const verification=useMemo(()=>getOrangeChipVerification(selectedAsset),[selectedAsset])
  const assessment=useMemo(()=>assessPersistentEvidence(selectedAsset,vaultEvidence,verification),[selectedAsset,vaultEvidence,verification])
  const xcpObservation=observations.find(o=>o.venue==='XCP_DEX')
  const xcpQuote=xcpObservation?.quote
  const bestBidQuote=bestBid(marketQuotes)
  const bestAskQuote=bestAsk(marketQuotes)
  const asks=xcpQuote?.ask!=null?[[formatPrice(xcpQuote.ask),'LIVE','COUNTERPARTY']]:modelAsks
  const bids=xcpQuote?.bid!=null?[[formatPrice(xcpQuote.bid),'LIVE','COUNTERPARTY']]:modelBids
  const spread=bestAskQuote?.ask!=null&&bestBidQuote?.bid!=null?bestAskQuote.ask-bestBidQuote.bid:null
  const selectedBalance=foundationBalances.find(balance=>balance.asset===selectedAsset)
  const selectedIssuance=stockIssuances.find(issuance=>issuance.asset===selectedAsset)
  const filteredStocks=stockIssuances.filter(row=>(row.asset??'').toUpperCase().includes(search.trim().toUpperCase()))
  const tokenQuote=marketQuotes.find(q=>q.venue==='EXTERNAL')

  return <div className="neo-explorer">
    <section className="explorer-hero"><div><p>NEO EXPLORER • GLOBAL BITCOIN / COUNTERPARTY INTELLIGENCE TERMINAL</p><h2>NEO DEX</h2><span>Counterparty • TokenScan redundancy • Orange Chip™ Stocks • CES • NEO Prime • NEO Algo • Evidence Vault</span></div><div className="explorer-actions"><label className="explorer-search"><Search size={15}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search Orange Chip™ stock"/></label><button onClick={refresh}><RefreshCw size={15}/> Refresh</button></div></section>
    <section className="foundation-registry"><div><span>ORANGE CHIP™ CENTRAL LISTING WALLET</span><b>{CENTRAL_LISTING_WALLET}</b><small>{stockIssuances.length?`${formatCount(stockIssuances.length)} Orange Chip™ Stocks discovered from valid issuances.`:'Reading Central Listing Wallet issuance history…'}</small></div><div className="foundation-links"><a href={`https://tokenscan.io/address/${CENTRAL_LISTING_WALLET}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> TokenScan</a><a href={`https://blockstream.info/address/${CENTRAL_LISTING_WALLET}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Bitcoin</a></div></section>
    <section className="explorer-stats"><div><span>SELECTED MARKET</span><b>{pair}</b><small>{feedState==='loading'?'Refreshing feeds…':feedState==='live'?'Multi-source market feed':'Market feeds degraded'}</small></div><div><span>BEST BID</span><b>{formatPrice(bestBidQuote?.bid)}</b><small>{bestBidQuote?`Source: ${bestBidQuote.venue}`:'No attributed bid'}</small></div><div><span>BEST ASK</span><b>{formatPrice(bestAskQuote?.ask)}</b><small>{bestAskQuote?`Source: ${bestAskQuote.venue}`:'No attributed ask'}</small></div><div><span>LAST / VOLUME</span><b>{formatPrice(tokenQuote?.last)}</b><small>{tokenQuote?.volume24h!=null?`${tokenQuote.volume24h.toLocaleString()} reported volume`:'TokenScan history unavailable'}</small></div><div><span>EVIDENCE VAULT</span><b>{vaultState.toUpperCase()}</b><small>{vaultEvidence.length} persistent record(s)</small></div></section>
    <section className="market-source-strip">{marketQuotes.length?marketQuotes.map(quote=><div key={`${quote.venue}-${quote.source}`}><b>{quote.venue}</b><span>BID {formatPrice(quote.bid)}</span><span>ASK {formatPrice(quote.ask)}</span><small>{shortTime(quote.timestamp)}</small></div>):<div><b>NO LIVE QUOTES</b><span>Waiting for attributed market sources.</span></div>}<div><b>REFRESHED</b><span>{shortTime(observedAt)}</span><small>Read-only market intelligence</small></div></section>
    <section className="explorer-grid">
      <article className="card explorer-panel orderbook"><div className="explorer-panel-title"><div><span>NEO DEX ORDER BOOK</span><h3>{pair}</h3></div><em>{xcpQuote?'COUNTERPARTY LIVE':'MODEL'}</em></div><div className="book-cols"><span>PRICE XCP</span><span>AMOUNT {selectedAsset}</span><span>SOURCE</span></div>{asks.map(r=><div className="book-row ask" key={`a-${r[0]}`}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}<div className="spread">ATTRIBUTED SPREAD <b>{spread==null?'—':formatPrice(spread)} XCP</b></div>{bids.map(r=><div className="book-row bid" key={`b-${r[0]}`}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}<p className="model-note">{xcpQuote?'Order-book top values come from Counterparty v2. TokenScan is independently attributed in the market-source strip and NEO Algo evidence.':'Fallback rows are illustrative only and excluded from verified confidence.'}</p></article>
      <article className="card explorer-panel trade-ticket"><div className="explorer-panel-title"><div><span>ORANGE CHIP™ STOCK INTELLIGENCE</span><h3>{selectedAsset}</h3></div><Activity size={17}/></div><div className="prime-copy intelligence-grid"><div><b>Issuance source</b><p>{selectedIssuance?.source??selectedIssuance?.issuer??'Not reported'}</p></div><div><b>Issued quantity</b><p>{issuanceQuantity(selectedIssuance)}</p></div><div><b>Central-wallet balance</b><p>{balanceValue(selectedBalance)}</p></div><div><b>Holders</b><p>{holderCount==null?'—':formatCount(holderCount)}</p></div><div><b>Divisible / locked</b><p>{String(assetInfo?.divisible??'—')} / {String(assetInfo?.locked??'—')}</p></div><div><b>Dispensers</b><p>{dispenserCount==null?'—':formatCount(dispenserCount)}</p></div><div className="wide"><b>Description</b><p>{selectedIssuance?.description||assetInfo?.description||'No on-chain description reported.'}</p></div></div><div className="asset-links"><a href={`https://tokenscan.io/asset/${selectedAsset}`} target="_blank" rel="noreferrer">TokenScan asset ↗</a><a href={`https://xcpdex.com/${selectedAsset}`} target="_blank" rel="noreferrer">XCP DEX ↗</a></div></article>
      <article className="card explorer-panel prime-panel"><div className="explorer-panel-title"><div><span>NEO EVIDENCE VAULT</span><h3>{assessment.recommendedLevel}</h3></div><Sparkles size={17}/></div><div className="prime-copy"><b>Persistent evidence score</b><p>{assessment.score} / 100</p><b>Accepted</b><p>{assessment.accepted}</p><b>Unreviewed</b><p>{assessment.unreviewed}</p><b>Rejected / conflicted</b><p>{assessment.rejected} / {assessment.conflicted}</p><b>Vault state</b><p>{vaultState}</p>{assessment.rationale.map(note=><p key={note}>{note}</p>)}<small>Orange Chip™ listing provenance and off-chain verification remain separate controls.</small></div></article>
    </section>
    <section className="card algo-panel"><div className="explorer-panel-title"><div><span>NEO ALGO • MULTI-SOURCE MARKET MISSION</span><h3>{algo.result.missionId}</h3></div><em>{algo.confidence.toUpperCase()} CONFIDENCE</em></div><div className="algo-stages">{algo.result.stages.map(stage=><div key={stage.stage}><b>{stage.stage}</b><span>{stage.label.toUpperCase()}</span><p>{stage.notes[0]}</p></div>)}</div><div className="algo-summary"><div><span>RISK</span><b>{algo.result.risk.toUpperCase()}</b></div><div><span>APPROVAL</span><b>{algo.result.approvalRequired?'REQUIRED':'NOT REQUIRED'}</b></div><div><span>CONFLICTS</span><b>{algo.conflicts.length}</b></div><div><span>PROVENANCE</span><b>{algo.result.provenance.join(' • ')}</b></div></div><p className="algo-recommendation">{algo.result.recommendation}</p></section>
    <section className="card registry-panel"><div className="explorer-panel-title"><div><span>ORANGE CHIP™ STOCK REGISTRY</span><h3>Central Listing Wallet Issuances</h3></div><Bitcoin size={17}/></div><div className="registry-table"><div className="registry-head"><span>STOCK</span><span>ISSUED QUANTITY</span><span>MARKET</span><span>STATUS</span></div>{filteredStocks.map(issuance=><button className="registry-row" key={issuance.asset} onClick={()=>issuance.asset&&setSelectedAsset(issuance.asset)}><b>{issuance.asset}</b><span>{issuanceQuantity(issuance)}</span><span>{issuance.asset}/XCP</span><em>{issuance.asset===selectedAsset?'SELECTED':'ORANGE CHIP™ STOCK'}</em></button>)}</div>{!filteredStocks.length&&<p className="empty-registry">No Orange Chip™ Stocks match “{search}”.</p>}</section>
    <section className="explorer-architecture"><div><Bitcoin size={18}/><b>Bitcoin</b><span>Settlement foundation</span></div><div><BookOpen size={18}/><b>Counterparty</b><span>Protocol + order data</span></div><div><Globe2 size={18}/><b>TokenScan</b><span>Redundant market intelligence</span></div><div><WalletCards size={18}/><b>NEO DEX</b><span>Non-custodial market interface</span></div><div><Sparkles size={18}/><b>NEO Algo</b><span>Multi-source reasoning</span></div></section>
  </div>
}
