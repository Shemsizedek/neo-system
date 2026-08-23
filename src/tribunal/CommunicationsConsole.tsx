import {useMemo,useState} from 'react'
import {Activity,Mail,RefreshCcw,Send,ShieldCheck} from 'lucide-react'
import {TribunalServerApi,type CommAdapterStatus,type CommOutboxItem,type CommReport,type CommTemplate,type ServerSession,type ServerWorkspace} from './serverApi'

const SESSION_KEY='neo.tribunal.server.session.v1',WORKSPACE_KEY='neo.tribunal.server.workspace.v1'
function read<T>(key:string):T|null{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}

export function CommunicationsConsole(){
  const session=read<ServerSession>(SESSION_KEY),workspace=read<ServerWorkspace>(WORKSPACE_KEY)
  const baseUrl=localStorage.getItem('neo.tribunal.server.url')||'http://localhost:8787'
  const api=useMemo(()=>new TribunalServerApi(baseUrl,session?.token||''),[baseUrl,session?.token])
  const [templates,setTemplates]=useState<CommTemplate[]>([]),[outbox,setOutbox]=useState<CommOutboxItem[]>([]),[adapters,setAdapters]=useState<CommAdapterStatus[]>([]),[report,setReport]=useState<CommReport|null>(null)
  const [name,setName]=useState('Notice of Tribunal Filing'),[channel,setChannel]=useState('RECORD'),[subject,setSubject]=useState('Notice — {{claimNo}}'),[body,setBody]=useState('Notice is entered in the Tribunal record for claim {{claimNo}}.')
  const [destination,setDestination]=useState('tribunal-record'),[status,setStatus]=useState('Console not loaded')
  const refresh=async()=>{if(!workspace)return;try{const [t,o,a,r]=await Promise.all([api.listCommTemplates(workspace.id),api.listOutbox(workspace.id),api.listCommAdapters(workspace.id),api.communicationsReport(workspace.id)]);setTemplates(t.items);setOutbox(o.items);setAdapters(a.items);setReport(r);setStatus('Communications state refreshed')}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const createTemplate=async()=>{if(!workspace)return;try{await api.createCommTemplate(workspace.id,{name,channel,subjectTemplate:subject,bodyTemplate:body});await refresh()}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const queue=async()=>{if(!workspace)return;try{await api.queueCommunication(workspace.id,{channel,destination,subject,body});await refresh()}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const runWorker=async()=>{if(!workspace)return;try{const result=await api.runCommWorker(workspace.id,{limit:25,maxAttempts:3});setStatus(`Worker processed ${result.processed} item(s)`);await refresh()}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const acknowledge=async(item:CommOutboxItem)=>{if(!workspace)return;try{await api.acknowledgeReceipt(workspace.id,item.id,{outcome:'DELIVERED',providerRef:item.providerRef||undefined,receipt:{source:'communications-console'}});await refresh()}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  if(!session||!workspace)return <section className="card panel"><div className="paneltitle"><div><span>Communications Console</span><small>Sign in and select a Tribunal workspace in Operations first.</small></div><Mail size={18}/></div></section>
  return <section className="card panel">
    <div className="paneltitle"><div><span>Communications Console v1.3</span><small>Templates, provider boundaries, outbox worker, signed receipts and service status</small></div><Mail size={18}/></div>
    <div className="route"><span>WORKSPACE</span><b>{workspace.name} • {workspace.role}</b></div><div className="route"><span>STATUS</span><b>{status}</b></div>
    <button onClick={()=>void refresh()}><RefreshCcw size={14}/> Refresh console</button> <button className="primary" onClick={()=>void runWorker()}><Activity size={14}/> Run due queue</button>
    {report&&<div className="tribunalcitegrid"><div className="route"><span>OUTBOX</span><b>{report.queued} active • {report.delivered} delivered</b></div><div className="route"><span>RECOVERY</span><b>{report.deadLetters} dead letter(s)</b></div></div>}
    <div className="paneltitle"><div><span>Adapter Status</span><small>External providers stay boundary-only until a deployed transport is configured.</small></div><ShieldCheck size={18}/></div>
    {adapters.map(a=><div className="route" key={a.type}><span>{a.type} • {a.mode}</span><b>{a.ready?'READY':'CONFIG REQUIRED'} • {a.configs.filter(c=>c.enabled).length} enabled</b></div>)}
    <div className="paneltitle"><div><span>Template Builder</span><small>Reusable notice and hearing communications</small></div><Send size={18}/></div>
    <div className="tribunalcitegrid"><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Channel<select value={channel} onChange={e=>setChannel(e.target.value)}><option>RECORD</option><option>EMAIL</option><option>CERTIFIED_EMAIL</option><option>WEBHOOK</option></select></label></div>
    <label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Body<textarea rows={3} value={body} onChange={e=>setBody(e.target.value)}/></label><button onClick={()=>void createTemplate()}>Save template</button>
    <div className="route"><span>TEMPLATES</span><b>{templates.length}</b></div>
    <div className="paneltitle"><div><span>Queue Communication</span><small>Worker state is auditable; provider delivery requires an explicit receipt.</small></div><Send size={18}/></div>
    <div className="tribunalcitegrid"><label>Destination<input value={destination} onChange={e=>setDestination(e.target.value)}/></label><label>Channel<select value={channel} onChange={e=>setChannel(e.target.value)}><option>RECORD</option><option>EMAIL</option><option>CERTIFIED_EMAIL</option><option>WEBHOOK</option></select></label></div><button className="primary" onClick={()=>void queue()}>Queue communication</button>
    <div className="tablewrap"><table><thead><tr><th>Channel</th><th>Destination</th><th>Status</th><th>Attempts</th><th>Provider ref</th><th>Action</th></tr></thead><tbody>{outbox.map(item=><tr key={item.id}><td>{item.channel}</td><td>{item.destination}</td><td>{item.status}</td><td>{item.attemptCount}</td><td className="mono">{item.providerRef||'—'}</td><td>{item.status==='AWAITING_PROVIDER'?<button onClick={()=>void acknowledge(item)}>Record delivered receipt</button>:'—'}</td></tr>)}</tbody></table></div>
  </section>
}
