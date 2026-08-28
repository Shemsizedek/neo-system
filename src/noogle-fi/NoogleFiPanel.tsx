import {useEffect,useMemo,useState} from 'react'
import {RefreshCw,Route} from 'lucide-react'
import {getNoogleFiHealth,routeNoogleFi} from './router'
import type {NoogleFiCapability,NoogleFiProvider} from './types'

export function NoogleFiPanel(){
  const[providers,setProviders]=useState<NoogleFiProvider[]>([])
  const[capability,setCapability]=useState<NoogleFiCapability>('voice')
  const[destination,setDestination]=useState('+1 210 555 0144')
  const[loading,setLoading]=useState(false)
  const refresh=async()=>{setLoading(true);try{setProviders(await getNoogleFiHealth())}finally{setLoading(false)}}
  useEffect(()=>{void refresh()},[])
  const decision=useMemo(()=>routeNoogleFi({capability,destination}),[capability,destination,providers])
  return <div className="wire-card" style={{marginTop:18}}><div className="wire-row"><div><div className="wire-label">NOOGLE FI BACKGROUND SERVICE FABRIC</div><h2 style={{margin:'6px 0 0'}}>Telecommunications Routing Desk</h2></div><button className="wire-btn secondary" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/>{loading?' Checking':' Refresh'}</button></div><div className="wire-split"><div><label>Capability<select value={capability} onChange={e=>setCapability(e.target.value as NoogleFiCapability)}>{['voice','sms','mms','ivr','webrtc','esim','data','nvsn','mesh'].map(x=><option key={x}>{x}</option>)}</select></label><label>Destination<input value={destination} onChange={e=>setDestination(e.target.value)}/></label><div className="wire-quote" style={{marginTop:14}}><Route size={16}/><b>{decision.mode}</b><div className="wire-metric">{decision.provider?.name||'Provider configuration required'}</div><div className="wire-muted">{decision.rationale}</div></div></div><div>{providers.map(p=><div className="wire-row" key={p.id}><div><b>{p.name}</b><div className="wire-muted">{p.capabilities.join(' · ')}<br/>{p.notes}</div></div><b className={p.state==='READY'?'wire-green':'wire-amber'}>{p.state}</b></div>)}</div></div><p className="wire-muted">Noogle Fi chooses a background transport; NEO Wire remains the user-facing protocol. Provider credentials and privileged carrier actions stay outside the browser.</p></div>
}
