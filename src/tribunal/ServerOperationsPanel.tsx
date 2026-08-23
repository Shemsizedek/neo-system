import {useMemo,useState} from 'react'
import {Cloud,Database,KeyRound,RefreshCcw,ShieldCheck} from 'lucide-react'
import type {TribunalCase} from './tribunalEngine'
import {TribunalServerApi,type ServerSession,type ServerWorkspace} from './serverApi'

const SESSION_KEY='neo.tribunal.server.session.v1'
const WORKSPACE_KEY='neo.tribunal.server.workspace.v1'

function restoreSession():ServerSession|null{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function restoreWorkspace():ServerWorkspace|null{try{return JSON.parse(localStorage.getItem(WORKSPACE_KEY)||'null')}catch{return null}}

export function ServerOperationsPanel({caseFile,setCaseFile}:{caseFile:TribunalCase;setCaseFile:(next:TribunalCase)=>void}){
  const [baseUrl,setBaseUrl]=useState(()=>localStorage.getItem('neo.tribunal.server.url')||'http://localhost:8787')
  const [session,setSession]=useState<ServerSession|null>(()=>restoreSession())
  const [workspace,setWorkspace]=useState<ServerWorkspace|null>(()=>restoreWorkspace())
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [displayName,setDisplayName]=useState('')
  const [workspaceName,setWorkspaceName]=useState('World Interfaith Tribunal')
  const [revision,setRevision]=useState<number|undefined>()
  const [status,setStatus]=useState('Backend not checked')
  const [audit,setAudit]=useState('Not verified')
  const api=useMemo(()=>new TribunalServerApi(baseUrl,session?.token||''),[baseUrl,session])

  const rememberUrl=(value:string)=>{setBaseUrl(value);localStorage.setItem('neo.tribunal.server.url',value)}
  const health=async()=>{try{const h=await api.health();setStatus(`ONLINE • ${h.service} v${h.version}`)}catch(e){setStatus(`OFFLINE • ${e instanceof Error?e.message:String(e)}`)}}
  const register=async()=>{try{await api.register({email,displayName,password});setStatus('Account registered. Sign in to continue.')}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const login=async()=>{try{const next=await api.login({email,password});setSession(next);localStorage.setItem(SESSION_KEY,JSON.stringify(next));setStatus(`Authenticated as ${next.user.displayName}`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const createWorkspace=async()=>{try{const next=await api.createWorkspace(workspaceName);setWorkspace(next);localStorage.setItem(WORKSPACE_KEY,JSON.stringify(next));setStatus(`Workspace ready: ${next.name}`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const push=async()=>{if(!workspace)return;try{const result=await api.saveCase(workspace.id,caseFile,revision);setRevision(result.revision);setStatus(`Synced ${result.claimNo} • revision ${result.revision}`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const pull=async()=>{if(!workspace)return;try{const result=await api.getCase(workspace.id,caseFile.claimNo);setCaseFile(result.caseFile);setRevision(result.revision);setStatus(`Loaded server revision ${result.revision}`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const verify=async()=>{if(!workspace)return;try{const result=await api.verifyAudit(workspace.id);setAudit(result.valid?`VERIFIED • ${result.count} entries • ${result.head?.slice(0,12)||'empty'}`:'REVIEW REQUIRED')}catch(e){setAudit(e instanceof Error?e.message:String(e))}}
  const signOut=()=>{setSession(null);setWorkspace(null);setRevision(undefined);localStorage.removeItem(SESSION_KEY);localStorage.removeItem(WORKSPACE_KEY);setStatus('Signed out')}

  return <section className="card panel">
    <div className="paneltitle"><div><span>Server-Synchronized Operations</span><small>Authenticated backend, workspace selection, live case revisions and audit verification</small></div><Cloud size={18}/></div>
    <div className="tribunalcitegrid"><label>Backend URL<input value={baseUrl} onChange={e=>rememberUrl(e.target.value)}/></label><label>Health<div className="route"><span>STATUS</span><b>{status}</b></div></label></div>
    <button onClick={()=>void health()}><RefreshCcw size={14}/> Check backend</button>
    {!session?<>
      <div className="tribunalcitegrid"><label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label></div>
      <label>Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label>
      <button onClick={()=>void register()} disabled={!email||!password||!displayName}><KeyRound size={14}/> Register</button> <button className="primary" onClick={()=>void login()} disabled={!email||!password}>Sign in</button>
    </>:<>
      <div className="route"><span>IDENTITY</span><b>{session.user.displayName} • {session.user.email}</b></div>
      {!workspace?<div className="tribunalcitegrid"><label>Workspace name<input value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)}/></label><div><button className="primary" onClick={()=>void createWorkspace()}><Database size={14}/> Create workspace</button></div></div>:<>
        <div className="route"><span>WORKSPACE</span><b>{workspace.name} • {workspace.role} • revision {revision??'unsynced'}</b></div>
        <div className="route"><span>AUDIT</span><b>{audit}</b></div>
        <button className="primary" onClick={()=>void push()}>Push case</button> <button onClick={()=>void pull()}>Pull case</button> <button onClick={()=>void verify()}><ShieldCheck size={14}/> Verify audit</button>
      </>}
      <button onClick={signOut}>Sign out</button>
    </>}
  </section>
}
