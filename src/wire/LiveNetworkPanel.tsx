import {useEffect,useState} from 'react'
import {Activity,RefreshCw} from 'lucide-react'
import {getLiveNetworkSnapshot,type LiveService} from './services/network'

function tone(state:LiveService['state']){return state==='LIVE'?'wire-green':state==='DEGRADED'?'wire-amber':'wire-muted'}

export function LiveNetworkPanel({compact=false}:{compact?:boolean}){
  const[services,setServices]=useState<LiveService[]>([])
  const[loading,setLoading]=useState(true)
  const refresh=async()=>{setLoading(true);try{setServices(await getLiveNetworkSnapshot())}finally{setLoading(false)}}
  useEffect(()=>{void refresh()},[])
  if(compact)return <div className="wire-card" style={{marginTop:18}}><div className="wire-row"><div><b>Live Network</b><div className="wire-muted">Read-only connector health</div></div><b className={services.some(s=>s.state==='LIVE')?'wire-green':'wire-amber'}>{loading?'CHECKING':`${services.filter(s=>s.state==='LIVE').length}/${services.length} LIVE`}</b></div></div>
  return <div className="wire-card" style={{marginTop:18}}><div className="wire-row"><div><div className="wire-label">LIVE CONNECTORS</div><h2 style={{margin:'6px 0 0'}}>Read-only Network Health</h2></div><button className="wire-btn secondary" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/>{loading?' Checking':' Refresh'}</button></div>{services.length===0&&<div className="wire-row"><span className="wire-muted">Initializing connector checks…</span><Activity size={16}/></div>}{services.map(s=><div className="wire-row" key={s.id}><div><b>{s.name}</b><div className="wire-muted">{s.detail}{typeof s.latencyMs==='number'?` · ${s.latencyMs} ms`:''}</div></div><b className={tone(s.state)}>{s.state}</b></div>)}</div>
}
