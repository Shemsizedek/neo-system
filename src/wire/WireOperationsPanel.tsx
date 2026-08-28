import {useEffect,useMemo,useState} from 'react'
import {BookOpen,MessageSquareText,RefreshCw,SatelliteDish} from 'lucide-react'
import {loadDirectory,upsertDirectoryEntry,type WireDirectoryEntry} from './directory'
import {createTelegram,type NeoTelegram} from './telegram'
import {readBitcoinAddress,readBitcoinTelemetry,readCounterpartyBalances,type BitcoinTelemetry,type NormalizedAssetBalance} from './services/network'

export function WireOperationsPanel(){
  const[directory,setDirectory]=useState<WireDirectoryEntry[]>(()=>loadDirectory())
  const[wireNumber,setWireNumber]=useState('+1 210 555 0144')
  const[btc,setBtc]=useState('')
  const[xcp,setXcp]=useState('')
  const[telemetry,setTelemetry]=useState<BitcoinTelemetry|null>(null)
  const[btcRead,setBtcRead]=useState<string>('Not watched')
  const[assets,setAssets]=useState<NormalizedAssetBalance[]>([])
  const[telegram,setTelegram]=useState<NeoTelegram|null>(null)
  const[busy,setBusy]=useState(false)
  const selected=useMemo(()=>directory.find(x=>x.wireNumber===wireNumber),[directory,wireNumber])
  useEffect(()=>{if(selected){setBtc(selected.bitcoinAddress||'');setXcp(selected.counterpartyAddress||'')}},[selected])
  const refresh=async()=>{setBusy(true);try{setTelemetry(await readBitcoinTelemetry());if(btc){const r=await readBitcoinAddress(btc);setBtcRead(`${(r.confirmedSats/1e8).toFixed(8)} BTC · ${r.txCount} tx`)}if(xcp){const r=await readCounterpartyBalances(xcp);setAssets(r.balances.filter(a=>['XCP','NOMNI'].includes(a.asset)||a.quantity!==0).slice(0,12))}}finally{setBusy(false)}}
  const save=()=>setDirectory(upsertDirectoryEntry({wireNumber,neoId:selected?.neoId||`NEO-${Date.now().toString().slice(-8)}`,label:selected?.label||'NEO Wire Contact',bitcoinAddress:btc||undefined,counterpartyAddress:xcp||undefined,verified:false,updatedAt:new Date().toISOString()}))
  const draft=()=>setTelegram(createTelegram({kind:'TEXT',from:'NEO-00000144',to:selected?.neoId||wireNumber,body:'NEO Wire secure telegram draft'}))
  return <div className="wire-split"><div className="wire-card"><div className="wire-row"><div><div className="wire-label">NETWORK TELEMETRY</div><h2>Bitcoin + Counterparty Watch</h2></div><button className="wire-btn secondary" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={15}/>{busy?' Checking':' Refresh'}</button></div><div className="wire-row"><span>Bitcoin tip</span><b>{telemetry?.height?.toLocaleString()||'—'}</b></div><div className="wire-row"><span>Fast fee</span><b>{telemetry?.fastestFee?`${telemetry.fastestFee} sat/vB`:'—'}</b></div><div className="wire-row"><span>Mempool</span><b>{telemetry?.mempoolCount?.toLocaleString()||'—'}</b></div><label>NEO Wire Number<input value={wireNumber} onChange={e=>setWireNumber(e.target.value)}/></label><label>Bitcoin watch address<input value={btc} onChange={e=>setBtc(e.target.value)} placeholder="bc1…"/></label><div className="wire-row"><span>BTC read</span><b>{btcRead}</b></div><label>Counterparty watch address<input value={xcp} onChange={e=>setXcp(e.target.value)} placeholder="1…"/></label><div className="wire-actions"><button className="wire-btn" onClick={save}>Save Directory Entry</button></div>{assets.map(a=><div className="wire-row" key={a.asset}><span>{a.asset}</span><b>{a.quantity.toLocaleString(undefined,{maximumFractionDigits:8})}</b></div>)}</div><div className="wire-card"><BookOpen size={22} className="wire-cyan"/><div className="wire-label">NEO WIRE DIRECTORY</div><h2>Number → Wallet Identity</h2>{directory.slice(0,5).map(d=><div className="wire-row" key={d.wireNumber}><div><b>{d.wireNumber}</b><div className="wire-muted">{d.neoId} · {d.verified?'verified':'local'}</div></div><span>{d.bitcoinAddress?'BTC ':''}{d.counterpartyAddress?'XCP':''}</span></div>)}<div className="wire-row"><div><MessageSquareText size={18}/><b> NEO Telegram NWT-1</b><div className="wire-muted">Draft-only signed-message envelope boundary</div></div><button className="wire-btn secondary" onClick={draft}>Draft</button></div>{telegram&&<div className="wire-quote"><b>{telegram.id}</b><div className="wire-muted">{telegram.from} → {telegram.to}</div><p>{telegram.body}</p><small className="wire-amber">DRAFT — not signed or transmitted</small></div>}<div className="wire-row"><div><SatelliteDish size={18}/><b> Transport adapters</b></div><b className="wire-amber">CREDENTIAL GATED</b></div><p className="wire-muted">SIP/SMS/IVR/eSIM, Lightning execution, and NVSN physical transport remain adapter boundaries. No keys, credentials, or radio-control commands are exposed to the browser.</p></div></div>
}
