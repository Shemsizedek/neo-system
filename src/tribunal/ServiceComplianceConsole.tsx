import {useMemo,useState} from 'react'
import {AlertTriangle,CheckCircle2,Clock3,FileDown,RefreshCcw,Route,ShieldCheck} from 'lucide-react'
import type {ServerSession,ServerWorkspace,ServiceCompliance} from './serverApi'

const SESSION_KEY='neo.tribunal.server.session.v1',WORKSPACE_KEY='neo.tribunal.server.workspace.v1'
function read<T>(key:string):T|null{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}

type TimelineEvent={at:string;type:string;recipientId:string;status:string;detail?:string}
type Alert={recipientId:string;level:string;action:string;reason:string}
type Recommendation={priority:string;action:string;reason:string;recipientId?:string}

export function ServiceComplianceConsole({claimNo}:{claimNo:string}){
  const session=read<ServerSession>(SESSION_KEY),workspace=read<ServerWorkspace>(WORKSPACE_KEY)
  const baseUrl=localStorage.getItem('neo.tribunal.server.url')||'http://localhost:8787'
  const [compliance,setCompliance]=useState<ServiceCompliance|null>(null),[timeline,setTimeline]=useState<TimelineEvent[]>([]),[alerts,setAlerts]=useState<Alert[]>([]),[recommendations,setRecommendations]=useState<Recommendation[]>([]),[status,setStatus]=useState('Console not loaded'),[packetHash,setPacketHash]=useState('')
  const headers=useMemo(()=>({'content-type':'application/json',...(session?.token?{authorization:`Bearer ${session.token}`}:{})}),[session?.token])
  const request=async<T,>(path:string,init:RequestInit={}):Promise<T>=>{const response=await fetch(`${baseUrl.replace(/\/$/,'')}${path}`,{...init,headers:{...headers,...(init.headers||{})}});const payload=await response.json();if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);return payload as T}
  const refresh=async()=>{if(!workspace)return;try{const root=`/v1/workspaces/${encodeURIComponent(workspace.id)}/service/compliance/${encodeURIComponent(claimNo)}`;const [c,t,e,r]=await Promise.all([request<ServiceCompliance>(root),request<{items:TimelineEvent[]}>(`${root}/timeline`),request<{alerts:Alert[]}>(`${root}/escalations`,{method:'POST',body:JSON.stringify({graceHours:24,maxAttempts:3})}),request<{recommendations:Recommendation[]}>(`${root}/recommendations`,{method:'POST',body:JSON.stringify({graceHours:24,maxAttempts:3})})]);setCompliance(c);setTimeline(t.items);setAlerts(e.alerts);setRecommendations(r.recommendations);setStatus('Compliance state refreshed')}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const sync=async()=>{if(!workspace)return;try{const result=await request<{syncedCount:number}>(`/v1/workspaces/${encodeURIComponent(workspace.id)}/service/sync-receipts`,{method:'POST',body:JSON.stringify({claimNo})});setStatus(`Synchronized ${result.syncedCount} delivered receipt(s)`);await refresh()}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const proofPacket=async()=>{if(!workspace)return;try{const packet=await request<{payloadHash:string}>(`/v1/workspaces/${encodeURIComponent(workspace.id)}/service/compliance/${encodeURIComponent(claimNo)}/proof-packet`);setPacketHash(packet.payloadHash);const blob=new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${claimNo}-service-proof-packet.json`;a.click();URL.revokeObjectURL(url);setStatus('Proof packet exported')}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  if(!session||!workspace)return <section className="card panel"><div className="paneltitle"><div><span>Service Compliance Console</span><small>Sign in and select a Tribunal workspace in Operations first.</small></div><ShieldCheck size={18}/></div></section>
  return <section className="card panel">
    <div className="paneltitle"><div><span>Service Compliance Console v1.7</span><small>Receipt synchronization, deadlines, escalation review, proof export and NEOsync recommendations</small></div><ShieldCheck size={18}/></div>
    <div className="route"><span>CLAIM</span><b>{claimNo}</b></div><div className="route"><span>STATUS</span><b>{status}</b></div>
    <button onClick={()=>void refresh()}><RefreshCcw size={14}/> Refresh</button> <button className="primary" onClick={()=>void sync()}><Route size={14}/> Sync delivered receipts</button> <button onClick={()=>void proofPacket()}><FileDown size={14}/> Export proof packet</button>
    {compliance&&<><div className="stats"><div className="card stat"><div><span>Served</span><strong>{compliance.summary.served}/{compliance.summary.total}</strong><small>{compliance.complete?'complete':'in progress'}</small></div><CheckCircle2 size={20}/></div><div className="card stat"><div><span>Pending</span><strong>{compliance.summary.pending}</strong><small>awaiting service</small></div><Clock3 size={20}/></div><div className="card stat"><div><span>Overdue</span><strong>{compliance.summary.overdue}</strong><small>deadline review</small></div><AlertTriangle size={20}/></div><div className="card stat"><div><span>Failed</span><strong>{compliance.summary.failed}</strong><small>service recovery</small></div><AlertTriangle size={20}/></div></div><p><small>{compliance.boundary}</small></p></>}
    <div className="paneltitle"><div><span>NEOsync Recommendations</span><small>Decision support only; authorized reviewers determine procedural sufficiency.</small></div><Route size={18}/></div>
    {recommendations.length?recommendations.map((r,i)=><div className="route" key={`${r.action}-${i}`}><span>{r.priority}</span><b>{r.action} — {r.reason}</b></div>):<p>No recommendations loaded.</p>}
    <div className="paneltitle"><div><span>Escalation Alerts</span><small>Due-soon, overdue and attempt-limit triggers.</small></div><AlertTriangle size={18}/></div>
    {alerts.length?alerts.map((a,i)=><div className="route" key={`${a.recipientId}-${i}`}><span>{a.level}</span><b>{a.action} — {a.reason}</b></div>):<p>No active alerts.</p>}
    <div className="paneltitle"><div><span>Service Timeline</span><small>Recipient registration, service attempts and proof events.</small></div><Clock3 size={18}/></div>
    <div className="tablewrap"><table><thead><tr><th>Time</th><th>Event</th><th>Recipient</th><th>Status</th><th>Detail</th></tr></thead><tbody>{timeline.map((event,i)=><tr key={`${event.at}-${i}`}><td>{new Date(event.at).toLocaleString()}</td><td>{event.type}</td><td className="mono">{event.recipientId}</td><td>{event.status}</td><td>{event.detail||'—'}</td></tr>)}</tbody></table></div>
    {packetHash&&<div className="route"><span>LAST PACKET SHA-256</span><b className="mono">{packetHash}</b></div>}
  </section>
}
