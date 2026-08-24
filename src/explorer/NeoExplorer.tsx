import {useEffect,useMemo,useState} from 'react'
import {Activity, Bitcoin, BookOpen, ExternalLink, FileCheck2, Globe2, Search, ShieldCheck, Sparkles, WalletCards} from 'lucide-react'
import {analyzeExplorerMarket} from './neoAlgoAdapter'
import type {MarketObservation} from './neoAlgoAdapter'
import {CounterpartyV2MarketAdapter} from './counterpartyAdapter'
import type {CounterpartyAssetInfo,CounterpartyBalance} from './counterpartyAdapter'
import {getOrangeChipVerification,verificationScore} from './orangeChipVerification'

const FOUNDATION_ADDRESS='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'
const QUOTE_ASSET='XCP'

const modelAsks=[['0.000084','1,250,000','105.00'],['0.000082','800,000','65.60'],['0.000080','600,000','48.00'],['0.000078','450,000','35.10']]
const modelBids=[['0.000076','700,000','53.20'],['0.000074','1,100,000','81.40'],['0.000072','900,000','64.80'],['0.000070','1,500,000','105.00']]

const formatPrice=(value?:number)=>value==null?'—':value.toLocaleString(undefined,{maximumFractionDigits:8})
const formatCount=(value:number)=>value.toLocaleString()
const balanceValue=(balance?:CounterpartyBalance)=>String(balance?.quantity_normalized??balance?.quantity??'—')

export function NeoExplorer(){
  const [selectedAsset,setSelectedAsset]=useState('NOMNI')
  const pair=`${selectedAsset}/${QUOTE_ASSET}`
  const [foundationAssets,setFoundationAssets]=useState<CounterpartyBalance[]>([])
  const [assetInfo,setAssetInfo]=useState<CounterpartyAssetInfo|null>(null)
  const [observations,setObservations]=useState<MarketObservation[]>([])
  const [feedState,setFeedState]=useState<'loading'|'live'|'degraded'>('loading')
  const [holderCount,setHolderCount]=useState<number|null>(null)
  const [dispenserCount,setDispenserCount]=useState<number|null>(null)

  useEffect(()=>{
    let cancelled=false
    const adapter=new CounterpartyV2MarketAdapter()
    setFeedState('loading')
    adapter.snapshot(pair,FOUNDATION_ADDRESS).then(snapshot=>{
      if(cancelled)return
      const discovered=snapshot.balances.filter(balance=>balance.asset&&Number(balance.quantity_normalized??balance.quantity??0)!==0)
      setFoundationAssets(discovered)
      if(!discovered.some(balance=>balance.asset===selectedAsset)&&discovered.length)setSelectedAsset(discovered[0].asset)
      setAssetInfo(snapshot.assetInfo)
      setHolderCount(snapshot.holders.length)
      setDispenserCount(snapshot.dispensers.length)
      setObservations([
        {venue:'XCP_DEX',source:snapshot.quote?.source??'Counterparty v2',status:snapshot.quote?'verified':'reported',note:snapshot.quote?'Read-only Counterparty order data loaded successfully.':'Counterparty responded successfully, but no open quote was found for this asset/XCP pair.',quote:snapshot.quote},
        {venue:'CES',source:'Community Exchange System',status:'unavailable',note:'Authorized CES runtime configuration is not connected to this browser session.'},
        {venue:'EXTERNAL',source:'External exchange adapters',status:'unavailable',note:'No verified external venue is configured for this asset.'},
        {venue:'NEO_DEX',source:'NEO DEX interface model',status:'illustrative',note:'Fallback order-book rows are UI fixtures and are not treated as live price evidence.'},
      ])
      setFeedState('live')
    }).catch(error=>{
      if(cancelled)return
      setObservations([
        {venue:'XCP_DEX',source:'Counterparty v2',status:'unavailable',note:error instanceof Error?error.message:'Counterparty feed unavailable.'},
        {venue:'CES',source:'Community Exchange System',status:'unavailable',note:'CES runtime not connected.'},
        {venue:'EXTERNAL',source:'External exchange adapters',status:'unavailable',note:'No external venue configured.'},
        {venue:'NEO_DEX',source:'NEO DEX interface model',status:'illustrative',note:'Fallback rows are illustrative only.'},
      ])
      setFeedState('degraded')
    })
    return()=>{cancelled=true}
  },[pair,selectedAsset])

  const algo=useMemo(()=>analyzeExplorerMarket(pair,observations),[pair,observations])
  const verification=useMemo(()=>getOrangeChipVerification(selectedAsset),[selectedAsset])
  const score=verificationScore(verification)
  const xcpObservation=observations.find(o=>o.venue==='XCP_DEX')
  const xcpQuote=xcpObservation?.quote
  const asks=xcpQuote?.ask!=null?[[formatPrice(xcpQuote.ask),'LIVE','ATTRIBUTED']]:modelAsks
  const bids=xcpQuote?.bid!=null?[[formatPrice(xcpQuote.bid),'LIVE','ATTRIBUTED']]:modelBids
  const spread=xcpQuote?.ask!=null&&xcpQuote?.bid!=null?xcpQuote.ask-xcpQuote.bid:null
  const selectedBalance=foundationAssets.find(balance=>balance.asset===selectedAsset)

  return <div className="neo-explorer">
    <section className="explorer-hero"><div><p>NEO EXPLORER • GLOBAL BITCOIN / COUNTERPARTY INTELLIGENCE TERMINAL</p><h2>NEO DEX</h2><span>Bitcoin settlement • Counterparty asset protocol • Orange Chip™ discovery • CES community liquidity • NEO Prime • NEO Algo</span></div><div className="explorer-actions"><button><Search size={15}/> Search Asset</button><button><Sparkles size={15}/> Ask NEO Prime</button></div></section>
    <section className="foundation-registry"><div><span>ORANGE CHIP™ FOUNDATION ADDRESS</span><b>{FOUNDATION_ADDRESS}</b><small>{foundationAssets.length?`${formatCount(foundationAssets.length)} non-zero Counterparty assets dynamically discovered.`:'Discovering foundation assets…'}</small></div><a href={`https://blockstream.info/address/${FOUNDATION_ADDRESS}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Blockstream</a></section>
    <section className="explorer-stats"><div><span>SELECTED MARKET</span><b>{pair}</b><small>{feedState==='loading'?'Connecting…':feedState==='live'?'Counterparty feed connected':'Counterparty feed degraded'}</small></div><div><span>BEST BID</span><b>{formatPrice(xcpQuote?.bid)}</b><small>Attributed: XCP DEX</small></div><div><span>BEST ASK</span><b>{formatPrice(xcpQuote?.ask)}</b><small>Attributed: XCP DEX</small></div><div><span>HOLDERS</span><b>{holderCount==null?'—':formatCount(holderCount)}</b><small>{selectedAsset} holder records</small></div><div><span>VERIFICATION</span><b>{verification.level}</b><small>Orange Chip™ score {score}/100</small></div></section>
    <section className="explorer-grid">
      <article className="card explorer-panel orderbook"><div className="explorer-panel-title"><div><span>NEO DEX ORDER BOOK</span><h3>{pair}</h3></div><em>{xcpQuote?'LIVE':'MODEL'}</em></div><div className="book-cols"><span>PRICE XCP</span><span>AMOUNT {selectedAsset}</span><span>TOTAL XCP</span></div>{asks.map(r=><div className="book-row ask" key={`a-${r[0]}`}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}<div className="spread">SPREAD <b>{spread==null?'—':formatPrice(spread)} XCP</b></div>{bids.map(r=><div className="book-row bid" key={`b-${r[0]}`}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}<p className="model-note">{xcpQuote?'Top-of-book values come from the read-only Counterparty v2 adapter and stay source-attributed.':'Fallback rows are illustrative only and excluded from NEO Algo verified confidence.'}</p></article>
      <article className="card explorer-panel trade-ticket"><div className="explorer-panel-title"><div><span>ASSET INTELLIGENCE CARD</span><h3>{selectedAsset}</h3></div><Activity size={17}/></div><div className="prime-copy"><b>Foundation balance</b><p>{balanceValue(selectedBalance)}</p><b>Issuer / owner</b><p>{assetInfo?.issuer??assetInfo?.owner??'Not reported'}</p><b>Supply</b><p>{String(assetInfo?.supply_normalized??assetInfo?.supply??'Not reported')}</p><b>Divisibility / lock</b><p>{assetInfo?.divisible==null?'Unknown':assetInfo.divisible?'Divisible':'Indivisible'} • {assetInfo?.locked==null?'Lock unknown':assetInfo.locked?'Locked':'Unlocked'}</p><b>Description</b><p>{assetInfo?.description||'No on-chain description reported.'}</p></div></article>
      <article className="card explorer-panel prime-panel"><div className="explorer-panel-title"><div><span>NEO PRIME + NEO ALGO</span><h3>Research Pane</h3></div><Sparkles size={17}/></div><div className="prime-copy"><b>Evidence synthesis</b><p>NEO Algo evaluates {pair} independently from Orange Chip™ verification status. NEO Prime presents the evidence without converting an on-chain token into an off-chain legal claim.</p></div>{observations.map(o=><div className="source-row" key={o.venue}><b>{o.venue}</b><span>{o.status.toUpperCase()}</span></div>)}</article>
    </section>
    <section className="card verification-panel"><div className="explorer-panel-title"><div><span>ORANGE CHIP™ VERIFICATION</span><h3>{selectedAsset} Evidence Profile</h3></div><ShieldCheck size={17}/></div><div className="verification-grid"><div><span>STATUS</span><b>{verification.level}</b></div><div><span>CLAIM TYPE</span><b>{verification.claimType}</b></div><div><span>SCORE</span><b>{score}/100</b></div><div><span>DOCUMENTS</span><b>{verification.evidence.length}</b></div><div><span>LEGAL ENTITY</span><b>{verification.legalEntity??'Not verified'}</b></div><div><span>JURISDICTION</span><b>{verification.jurisdiction??'Not verified'}</b></div></div><div className="verification-notes">{verification.notes.map(note=><p key={note}><FileCheck2 size={14}/>{note}</p>)}</div>{verification.evidence.length?<div className="evidence-list">{verification.evidence.map(doc=><div key={doc.id}><b>{doc.title}</b><span>{doc.status}</span><small>{doc.note??doc.issuer??'Evidence record'}</small></div>)}</div>:<p className="model-note">No accepted off-chain evidence documents are registered for this asset yet. Discovery status is not legal verification.</p>}</section>
    <section className="card algo-panel"><div className="explorer-panel-title"><div><span>NEO ALGO • MARKET MISSION</span><h3>{algo.result.missionId}</h3></div><em>{algo.confidence.toUpperCase()} CONFIDENCE</em></div><div className="algo-stages">{algo.result.stages.map(stage=><div key={stage.stage}><b>{stage.stage}</b><span>{stage.label.toUpperCase()}</span><p>{stage.notes[0]}</p></div>)}</div><div className="algo-summary"><div><span>RISK</span><b>{algo.result.risk.toUpperCase()}</b></div><div><span>APPROVAL</span><b>{algo.result.approvalRequired?'REQUIRED':'NOT REQUIRED'}</b></div><div><span>CONFLICTS</span><b>{algo.conflicts.length}</b></div><div><span>PROVENANCE</span><b>{algo.result.provenance.join(' • ')}</b></div></div><p className="algo-recommendation">{algo.result.recommendation}</p></section>
    <section className="card registry-panel"><div className="explorer-panel-title"><div><span>ORANGE CHIP™ ASSET REGISTRY</span><h3>Dynamic Foundation Universe</h3></div><Bitcoin size={17}/></div><div className="registry-table"><div className="registry-head"><span>ASSET</span><span>FOUNDATION BALANCE</span><span>MARKET</span><span>STATUS</span></div>{foundationAssets.map(asset=><button className="registry-row" key={asset.asset} onClick={()=>setSelectedAsset(asset.asset)}><b>{asset.asset}</b><span>{balanceValue(asset)}</span><span>{asset.asset}/XCP</span><em>{asset.asset===selectedAsset?'SELECTED':getOrangeChipVerification(asset.asset).level}</em></button>)}</div></section>
    <section className="explorer-architecture"><div><Bitcoin size={18}/><b>Bitcoin</b><span>Settlement foundation</span></div><div><BookOpen size={18}/><b>Counterparty</b><span>Dynamic asset discovery</span></div><div><Globe2 size={18}/><b>CES</b><span>Authorized runtime connector</span></div><div><WalletCards size={18}/><b>NEO DEX</b><span>Per-asset market interface</span></div><div><Sparkles size={18}/><b>NEO Algo</b><span>Reasoning + provenance</span></div></section>
  </div>
}
