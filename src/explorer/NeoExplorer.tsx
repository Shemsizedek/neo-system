import {useEffect,useMemo,useState} from 'react'
import {Activity, Bitcoin, BookOpen, ExternalLink, Globe2, Search, Sparkles, WalletCards} from 'lucide-react'
import {analyzeExplorerMarket} from './neoAlgoAdapter'
import type {MarketObservation} from './neoAlgoAdapter'
import {CounterpartyV2MarketAdapter} from './counterpartyAdapter'

const FOUNDATION_ADDRESS='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'
const PAIR='NOMNI/XCP'

const orangeChipAssets=[
  {symbol:'NOMNI',category:'Index / Unit of Account',market:'NOMNI/XCP',status:'FLAGSHIP'},
  {symbol:'ESTATEBOND',category:'Specialized Capital',market:'Pending',status:'REGISTRY'},
  {symbol:'NEOTRUST',category:'Private Asset',market:'Pending',status:'REGISTRY'},
  {symbol:'WORLDCREDIT',category:'Credit Instrument',market:'Pending',status:'REGISTRY'},
]

const modelAsks=[['0.000084','1,250,000','105.00'],['0.000082','800,000','65.60'],['0.000080','600,000','48.00'],['0.000078','450,000','35.10']]
const modelBids=[['0.000076','700,000','53.20'],['0.000074','1,100,000','81.40'],['0.000072','900,000','64.80'],['0.000070','1,500,000','105.00']]

const formatPrice=(value?:number)=>value==null?'—':value.toLocaleString(undefined,{maximumFractionDigits:8})
const formatCount=(value:number)=>value.toLocaleString()

export function NeoExplorer(){
  const [observations,setObservations]=useState<MarketObservation[]>([
    {venue:'XCP_DEX',source:'Counterparty v2',status:'unavailable',note:'Connecting to Counterparty market data.'},
    {venue:'CES',source:'Community Exchange System',status:'unavailable',note:'Authorized CES runtime configuration is not connected to this browser session.'},
    {venue:'EXTERNAL',source:'External exchange adapters',status:'unavailable',note:'No verified external NOMNI venue is configured.'},
    {venue:'NEO_DEX',source:'NEO DEX interface model',status:'illustrative',note:'Visible fallback order-book rows are UI fixtures and are not treated as live price evidence.'},
  ])
  const [feedState,setFeedState]=useState<'loading'|'live'|'degraded'>('loading')
  const [holderCount,setHolderCount]=useState<number|null>(null)
  const [dispenserCount,setDispenserCount]=useState<number|null>(null)
  const [foundationAssetCount,setFoundationAssetCount]=useState<number|null>(null)

  useEffect(()=>{
    let cancelled=false
    const adapter=new CounterpartyV2MarketAdapter()
    adapter.snapshot(PAIR,FOUNDATION_ADDRESS).then(snapshot=>{
      if(cancelled)return
      setHolderCount(snapshot.holders.length)
      setDispenserCount(snapshot.dispensers.length)
      setFoundationAssetCount(snapshot.balances.length)
      setObservations(current=>current.map(observation=>observation.venue==='XCP_DEX'?{
        venue:'XCP_DEX',
        source:snapshot.quote?.source??'Counterparty v2',
        status:snapshot.quote?'verified':'reported',
        note:snapshot.quote?'Read-only Counterparty order data loaded successfully.':'Counterparty responded successfully, but no open NOMNI/XCP quote was found.',
        quote:snapshot.quote,
      }:observation))
      setFeedState('live')
    }).catch(error=>{
      if(cancelled)return
      setObservations(current=>current.map(observation=>observation.venue==='XCP_DEX'?{
        venue:'XCP_DEX',source:'Counterparty v2',status:'unavailable',note:error instanceof Error?error.message:'Counterparty feed unavailable.'
      }:observation))
      setFeedState('degraded')
    })
    return()=>{cancelled=true}
  },[])

  const algo=useMemo(()=>analyzeExplorerMarket(PAIR,observations),[observations])
  const xcpObservation=observations.find(o=>o.venue==='XCP_DEX')
  const xcpQuote=xcpObservation?.quote
  const asks=xcpQuote?.ask!=null?[[formatPrice(xcpQuote.ask),'LIVE','ATTRIBUTED']]:modelAsks
  const bids=xcpQuote?.bid!=null?[[formatPrice(xcpQuote.bid),'LIVE','ATTRIBUTED']]:modelBids
  const spread=xcpQuote?.ask!=null&&xcpQuote?.bid!=null?xcpQuote.ask-xcpQuote.bid:null

  return <div className="neo-explorer">
    <section className="explorer-hero"><div><p>NEO EXPLORER • GLOBAL BITCOIN / COUNTERPARTY INTELLIGENCE TERMINAL</p><h2>NEO DEX</h2><span>Bitcoin settlement • Counterparty asset protocol • CES community liquidity • NEO Prime intelligence • NEO Algo reasoning</span></div><div className="explorer-actions"><button><Search size={15}/> Search Asset</button><button><Sparkles size={15}/> Ask NEO Prime</button></div></section>
    <section className="foundation-registry"><div><span>ORANGE CHIP™ FOUNDATION ADDRESS</span><b>{FOUNDATION_ADDRESS}</b><small>{foundationAssetCount==null?'Loading registry balances…':`${formatCount(foundationAssetCount)} Counterparty balance records observed at the foundation address.`}</small></div><a href={`https://blockstream.info/address/${FOUNDATION_ADDRESS}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Blockstream</a></section>
    <section className="explorer-stats"><div><span>FLAGSHIP MARKET</span><b>NOMNI / XCP</b><small>{feedState==='loading'?'Connecting…':feedState==='live'?'Counterparty feed connected':'Counterparty feed degraded'}</small></div><div><span>BEST BID</span><b>{formatPrice(xcpQuote?.bid)}</b><small>Attributed: XCP DEX</small></div><div><span>BEST ASK</span><b>{formatPrice(xcpQuote?.ask)}</b><small>Attributed: XCP DEX</small></div><div><span>HOLDERS</span><b>{holderCount==null?'—':formatCount(holderCount)}</b><small>NOMNI holder records</small></div><div><span>DISPENSERS</span><b>{dispenserCount==null?'—':formatCount(dispenserCount)}</b><small>NOMNI dispenser records</small></div></section>
    <section className="explorer-grid">
      <article className="card explorer-panel orderbook"><div className="explorer-panel-title"><div><span>NEO DEX ORDER BOOK</span><h3>NOMNI / XCP</h3></div><em>{xcpQuote?'LIVE':'MODEL'}</em></div><div className="book-cols"><span>PRICE XCP</span><span>AMOUNT NOMNI</span><span>TOTAL XCP</span></div>{asks.map(r=><div className="book-row ask" key={`a-${r[0]}`}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}<div className="spread">SPREAD <b>{spread==null?'—':formatPrice(spread)} XCP</b></div>{bids.map(r=><div className="book-row bid" key={`b-${r[0]}`}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}<p className="model-note">{xcpQuote?'Displayed top-of-book values come from the Counterparty v2 read-only adapter and remain attributed to that source.':'Fallback rows are illustrative only. NEO Algo excludes them from verified market confidence.'}</p></article>
      <article className="card explorer-panel trade-ticket"><div className="explorer-panel-title"><div><span>EXECUTION</span><h3>Trade NOMNI</h3></div><Activity size={17}/></div><div className="trade-tabs"><b>LIMIT</b><span>MARKET</span></div><label>PRICE (XCP)<input defaultValue={xcpQuote?.ask?String(xcpQuote.ask):''} placeholder="Enter price"/></label><label>AMOUNT (NOMNI)<input placeholder="Enter amount"/></label><div className="trade-total"><span>Estimated total</span><b>— XCP</b></div><div className="trade-buttons"><button>BUY</button><button>SELL</button></div><p>Execution remains disabled until the wallet/signing and Counterparty transaction-broadcast layer is connected. NEO Algo classifies financial execution as consequential and requires human authorization.</p></article>
      <article className="card explorer-panel prime-panel"><div className="explorer-panel-title"><div><span>NEO PRIME + NEO ALGO</span><h3>Market Intelligence</h3></div><Sparkles size={17}/></div><div className="prime-copy"><b>Liquidity synthesis</b><p>NEO Prime presents attributed market evidence. NEO Algo grounds, reconciles and resolves that evidence without promoting missing CES or external-market data into fabricated prices.</p></div>{observations.map(o=><div className="source-row" key={o.venue}><b>{o.venue}</b><span>{o.status.toUpperCase()}</span></div>)}</article>
    </section>
    <section className="card algo-panel"><div className="explorer-panel-title"><div><span>NEO ALGO • MARKET MISSION</span><h3>{algo.result.missionId}</h3></div><em>{algo.confidence.toUpperCase()} CONFIDENCE</em></div><div className="algo-stages">{algo.result.stages.map(stage=><div key={stage.stage}><b>{stage.stage}</b><span>{stage.label.toUpperCase()}</span><p>{stage.notes[0]}</p></div>)}</div><div className="algo-summary"><div><span>RISK</span><b>{algo.result.risk.toUpperCase()}</b></div><div><span>APPROVAL</span><b>{algo.result.approvalRequired?'REQUIRED':'NOT REQUIRED'}</b></div><div><span>CONFLICTS</span><b>{algo.conflicts.length}</b></div><div><span>PROVENANCE</span><b>{algo.result.provenance.join(' • ')}</b></div></div><p className="algo-recommendation">{algo.result.recommendation}</p></section>
    <section className="card registry-panel"><div className="explorer-panel-title"><div><span>ORANGE CHIP™ ASSET REGISTRY</span><h3>Foundation Universe</h3></div><Bitcoin size={17}/></div><div className="registry-table"><div className="registry-head"><span>ASSET</span><span>CLASSIFICATION</span><span>MARKET</span><span>STATUS</span></div>{orangeChipAssets.map(a=><div className="registry-row" key={a.symbol}><b>{a.symbol}</b><span>{a.category}</span><span>{a.market}</span><em>{a.status}</em></div>)}</div></section>
    <section className="explorer-architecture"><div><Bitcoin size={18}/><b>Bitcoin</b><span>Settlement foundation</span></div><div><BookOpen size={18}/><b>Counterparty</b><span>Live read-only market feed</span></div><div><Globe2 size={18}/><b>CES</b><span>Authorized runtime connector</span></div><div><WalletCards size={18}/><b>NEO DEX</b><span>Market interface</span></div><div><Sparkles size={18}/><b>NEO Algo</b><span>Reasoning + risk kernel</span></div></section>
  </div>
}
