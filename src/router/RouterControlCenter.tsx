import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clock3, GitBranch, Network, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react'

type Mission = { id:string; objective:string; priority:string; status:string; route:string[]; updatedAt:string }
type Approval = { id:string; missionId:string; action:string; status:string; requestedAt:string }
type Connector = { connectorId:string; state:string; checkedAt:string; detail?:Record<string,unknown> }
type Event = { id:string; type:string; missionId:string|null; timestamp:string; detail:Record<string,unknown> }
type Telemetry = {
  generatedAt:string
  summary:{ total:number; queued:number; running:number; awaitingApproval:number; terminal:number; pendingApprovals:number }
  missions:Mission[]
  approvals:Approval[]
  connectors:Connector[]
  events:Event[]
}

const fallback:Telemetry = {
  generatedAt:'',
  summary:{total:1,queued:0,running:1,awaitingApproval:0,terminal:0,pendingApprovals:0},
  missions:[{id:'NEO-ROUTER-MISSION-001',objective:'Triage and safely rebase stale neo-system pull requests, rerun CI, preserve provenance, and stop at approval gates before consequential merges.',priority:'high',status:'running',route:['github-native','asana-native','airbyte-agent-engine'],updatedAt:''}],
  approvals:[],
  connectors:[
    {connectorId:'github-native',state:'healthy',checkedAt:''},
    {connectorId:'asana-native',state:'healthy',checkedAt:''},
    {connectorId:'airbyte-agent-engine',state:'degraded',checkedAt:'',detail:{reason:'schema_discovery_error'}},
  ],
  events:[],
}

function badge(state:string){
  if(['healthy','bound','running','completed','approved'].includes(state)) return 'authorized'
  if(['degraded','awaiting_approval','pending','unbound'].includes(state)) return 'manual_review'
  return 'settlement_pending'
}

export function RouterControlCenter(){
  const[data,setData]=useState<Telemetry>(fallback)
  const[loading,setLoading]=useState(false)
  const[source,setSource]=useState<'live'|'fallback'>('fallback')

  const refresh=async()=>{
    setLoading(true)
    try{
      const res=await fetch('/api/router-telemetry',{cache:'no-store'})
      if(!res.ok) throw new Error(`telemetry ${res.status}`)
      setData(await res.json())
      setSource('live')
    }catch{
      setSource('fallback')
    }finally{setLoading(false)}
  }

  useEffect(()=>{
    refresh()
    const timer=window.setInterval(refresh,15000)
    return()=>window.clearInterval(timer)
  },[])

  const pending=useMemo(()=>data.approvals.filter(a=>a.status==='pending'),[data.approvals])

  return <>
    <section className="principles"><span>ORIGIN / NIA-001</span><span>MISSION ENGINE v2</span><span>LEAST PRIVILEGE</span><span>PROVENANCE</span><span>HUMAN APPROVAL</span></section>
    <section className="stats">
      <div className="card stat"><div><span>Mission Engine</span><strong>ACTIVE</strong><small>{source==='live'?'Live telemetry':'Fallback snapshot'}</small></div><Network size={22}/></div>
      <div className="card stat"><div><span>Running</span><strong>{data.summary.running}</strong><small>{data.summary.queued} queued</small></div><Activity size={22}/></div>
      <div className="card stat"><div><span>Approval Inbox</span><strong>{data.summary.pendingApprovals}</strong><small>High-impact actions waiting</small></div><ShieldCheck size={22}/></div>
      <div className="card stat"><div><span>Connector Heartbeats</span><strong>{data.connectors.length}</strong><small>15-second refresh cadence</small></div><GitBranch size={22}/></div>
    </section>

    <section className="card tablecard"><div className="paneltitle"><div><span>Mission Queue</span><small>Governed lifecycle state from Mission Engine v2</small></div><button className="iconbutton" onClick={refresh} disabled={loading} title="Refresh telemetry"><RefreshCw size={17}/></button></div><div className="tablewrap"><table><thead><tr><th>Mission</th><th>Priority</th><th>Status</th><th>Route</th><th>Objective</th></tr></thead><tbody>{data.missions.map(m=><tr key={m.id}><td className="mono">{m.id}</td><td>{m.priority}</td><td><span className={'pill '+badge(m.status)}>{m.status}</span></td><td>{m.route.join(' → ')}</td><td>{m.objective}</td></tr>)}</tbody></table></div></section>

    <section className="focusgrid">
      <div className="card focus"><ShieldCheck size={26}/><h2>Approval Inbox</h2>{pending.length===0?<p>No pending approvals. Consequential writes remain gated.</p>:pending.map(a=><p key={a.id}><b>{a.action}</b><br/><span className="mono">{a.missionId}</span></p>)}</div>
      <div className="card focus"><Clock3 size={26}/><h2>Execution History</h2>{data.events.slice(0,6).length===0?<p>Waiting for live event history.</p>:data.events.slice(0,6).map(e=><p key={e.id}><b>{e.type}</b><br/><span className="mono">{e.missionId||'router'}</span></p>)}</div>
    </section>

    <section className="card tablecard"><div className="paneltitle"><div><span>Connector Fabric</span><small>Heartbeat, binding and degradation state</small></div><Network size={18}/></div><div className="tablewrap"><table><thead><tr><th>Connector</th><th>Status</th><th>Control</th></tr></thead><tbody>{data.connectors.map(c=><tr key={c.connectorId}><td>{c.connectorId}</td><td><span className={'pill '+badge(c.state)}>{c.state}</span></td><td>{c.state==='degraded'||c.state==='unbound'?<><TriangleAlert size={14}/> fallback / remediation</>:<><CheckCircle2 size={14}/> governed</>}</td></tr>)}</tbody></table></div></section>

    <section className="card focus"><ShieldCheck size={26}/><h2>Runtime Boundary</h2><p>The browser receives read-only telemetry. Mission mutations, approvals, connector credentials and high-impact execution remain server-side and governed by ORIGIN policy.</p><p><small>Telemetry generated: {data.generatedAt||'local fallback'}</small></p></section>
  </>
}
