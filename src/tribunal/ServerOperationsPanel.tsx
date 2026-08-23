import {useMemo,useState} from 'react'
import {Cloud,Database,KeyRound,RefreshCcw,ShieldCheck,UsersRound} from 'lucide-react'
import type {TribunalCase} from './tribunalEngine'
import {TribunalServerApi,type OpsReport,type ServerMember,type ServerSession,type ServerWorkspace} from './serverApi'
import type {TribunalRole} from './rbac'

const SESSION_KEY='neo.tribunal.server.session.v1',WORKSPACE_KEY='neo.tribunal.server.workspace.v1'
function restoreSession():ServerSession|null{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function restoreWorkspace():ServerWorkspace|null{try{return JSON.parse(localStorage.getItem(WORKSPACE_KEY)||'null')}catch{return null}}

export function ServerOperationsPanel({caseFile,setCaseFile}:{caseFile:TribunalCase;setCaseFile:(next:TribunalCase)=>void}){
  const [baseUrl,setBaseUrl]=useState(()=>localStorage.getItem('neo.tribunal.server.url')||'http://localhost:8787')
  const [session,setSession]=useState<ServerSession|null>(()=>restoreSession()),[workspace,setWorkspace]=useState<ServerWorkspace|null>(()=>restoreWorkspace())
  const [workspaces,setWorkspaces]=useState<ServerWorkspace[]>([]),[members,setMembers]=useState<ServerMember[]>([])
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[displayName,setDisplayName]=useState(''),[workspaceName,setWorkspaceName]=useState('World Interfaith Tribunal')
  const [revision,setRevision]=useState<number|undefined>(),[status,setStatus]=useState('Backend not checked'),[audit,setAudit]=useState('Not verified'),[caseQuery,setCaseQuery]=useState(''),[caseMatches,setCaseMatches]=useState<Array<{claimNo:string;revision:number}>>([])
  const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[resetEmail,setResetEmail]=useState(''),[resetToken,setResetToken]=useState(''),[report,setReport]=useState<OpsReport|null>(null)
  const api=useMemo(()=>new TribunalServerApi(baseUrl,session?.token||''),[baseUrl,session])
  const rememberUrl=(value:string)=>{setBaseUrl(value);localStorage.setItem('neo.tribunal.server.url',value)}
  const health=async()=>{try{const h=await api.health();setStatus(`ONLINE • ${h.service} v${h.version} • schema ${h.schema??'—'}`)}catch(e){setStatus(`OFFLINE • ${e instanceof Error?e.message:String(e)}`)}}
  const register=async()=>{try{await api.register({email,displayName,password});setStatus('Account registered. Sign in to continue.')}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const login=async()=>{try{const next=await api.login({email,password});setSession(next);localStorage.setItem(SESSION_KEY,JSON.stringify(next));const found=await api.listWorkspaces();setWorkspaces(found.items);setStatus(`Authenticated as ${next.user.displayName}`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const discover=async()=>{try{const found=await api.listWorkspaces();setWorkspaces(found.items);setStatus(`${found.items.length} workspace(s) available`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const choose=async(id:string)=>{const next=workspaces.find(w=>w.id===id)||null;setWorkspace(next);if(next){localStorage.setItem(WORKSPACE_KEY,JSON.stringify(next));try{setMembers((await api.listMembers(next.id)).items)}catch{setMembers([])}}setRevision(undefined)}
  const createWorkspace=async()=>{try{const next=await api.createWorkspace(workspaceName);setWorkspace(next);setWorkspaces(v=>[...v,next]);localStorage.setItem(WORKSPACE_KEY,JSON.stringify(next));setStatus(`Workspace ready: ${next.name}`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const push=async()=>{if(!workspace)return;try{const result=await api.saveCase(workspace.id,caseFile,revision);setRevision(result.revision);setStatus(`Synced ${result.claimNo} • revision ${result.revision}`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const pull=async()=>{if(!workspace)return;try{const result=await api.getCase(workspace.id,caseFile.claimNo);setCaseFile(result.caseFile);setRevision(result.revision);setStatus(`Loaded server revision ${result.revision}`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const searchCases=async()=>{if(!workspace)return;try{const result=await api.listCases(workspace.id,caseQuery);setCaseMatches(result.items.map(i=>({claimNo:i.claimNo,revision:i.revision})));setStatus(`${result.items.length} case(s) matched`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const verify=async()=>{if(!workspace)return;try{const result=await api.verifyAudit(workspace.id);setAudit(result.valid?`VERIFIED • ${result.count} entries • ${result.head?.slice(0,12)||'empty'}`:'REVIEW REQUIRED')}catch(e){setAudit(e instanceof Error?e.message:String(e))}}
  const loadReport=async()=>{if(!workspace)return;try{setReport(await api.operationsReport(workspace.id));setStatus('Operational report refreshed')}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const changePassword=async()=>{try{await api.changePassword({currentPassword,newPassword});setStatus('Password changed; all sessions revoked. Sign in again.');await signOut()}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const issueReset=async()=>{if(!workspace||!resetEmail)return;try{const result=await api.issuePasswordReset(workspace.id,resetEmail);setResetToken(result.token);setStatus(`Reset token issued through ${result.expiresAt}`)}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const changeRole=async(userId:string,role:TribunalRole)=>{if(!workspace)return;try{await api.setMemberRole(workspace.id,userId,role);setMembers((await api.listMembers(workspace.id)).items);setStatus('Member role updated')}catch(e){setStatus(e instanceof Error?e.message:String(e))}}
  const signOut=async()=>{try{if(session)await api.logout()}catch{}setSession(null);setWorkspace(null);setWorkspaces([]);setMembers([]);setRevision(undefined);setReport(null);localStorage.removeItem(SESSION_KEY);localStorage.removeItem(WORKSPACE_KEY);setStatus('Signed out')}
  const ready=[session?'identity':null,workspace?'workspace':null,/ONLINE/.test(status)?'backend':null,/VERIFIED/.test(audit)?'audit':null].filter(Boolean).length

  return <section className="card panel">
    <div className="paneltitle"><div><span>NEO Tribunal v1.1 Operations</span><small>Identity recovery, member administration, synchronized records and operational reporting</small></div><Cloud size={18}/></div>
    <div className="tribunalcitegrid"><label>Backend URL<input value={baseUrl} onChange={e=>rememberUrl(e.target.value)}/></label><label>Release readiness<div className="route"><span>CHECKS</span><b>{ready}/4 ready</b></div></label></div>
    <div className="route"><span>HEALTH</span><b>{status}</b></div><button onClick={()=>void health()}><RefreshCcw size={14}/> Check backend</button>
    {!session?<><div className="tribunalcitegrid"><label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label></div><label>Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><button onClick={()=>void register()} disabled={!email||password.length<8||!displayName}><KeyRound size={14}/> Register</button> <button className="primary" onClick={()=>void login()} disabled={!email||!password}>Sign in</button></>:<>
      <div className="route"><span>IDENTITY</span><b>{session.user.displayName} • {session.user.email}</b></div>
      <button onClick={()=>void discover()}>Discover workspaces</button>
      {!!workspaces.length&&<label>Workspace<select value={workspace?.id||''} onChange={e=>void choose(e.target.value)}><option value="">Select workspace</option>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name} — {w.role}</option>)}</select></label>}
      {!workspace?<div className="tribunalcitegrid"><label>New workspace<input value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)}/></label><div><button className="primary" onClick={()=>void createWorkspace()}><Database size={14}/> Create workspace</button></div></div>:<>
        <div className="route"><span>WORKSPACE</span><b>{workspace.name} • {workspace.role} • revision {revision??'unsynced'}</b></div><div className="route"><span>AUDIT</span><b>{audit}</b></div>
        <button className="primary" onClick={()=>void push()}>Push case</button> <button onClick={()=>void pull()}>Pull case</button> <button onClick={()=>void verify()}><ShieldCheck size={14}/> Verify audit</button> <button onClick={()=>void loadReport()}>Refresh operations report</button>
        <div className="tribunalcitegrid"><label>Case search<input value={caseQuery} onChange={e=>setCaseQuery(e.target.value)} placeholder="Claim number"/></label><div><button onClick={()=>void searchCases()}>Search docket</button></div></div>
        {caseMatches.map(c=><div className="route" key={c.claimNo}><span>{c.claimNo}</span><b>revision {c.revision}</b></div>)}
        {report&&<div className="route"><span>OPS REPORT</span><b>{report.members} members • {report.cases} cases • {report.efiles} e-files • {report.notices} notices • {report.hearings} hearings • {report.deliveries} deliveries</b></div>}
        {!!members.length&&<div><div className="paneltitle"><div><span>Member Administration</span><small>Grand Sheik role changes remain server-enforced</small></div><UsersRound size={16}/></div>{members.map(m=><div className="route" key={m.userId}><span>{m.displayName}<br/><small>{m.email}</small></span><select value={m.role} onChange={e=>void changeRole(m.userId,e.target.value as TribunalRole)} disabled={workspace.role!=='GRAND_SHEIK'}><option>GRAND_SHEIK</option><option>JUDGE</option><option>CLERK</option><option>MARSHAL</option><option>REVIEWER</option><option>VIEWER</option></select></div>)}</div>}
        {workspace.role==='GRAND_SHEIK'&&<div className="tribunalcitegrid"><label>Member reset email<input value={resetEmail} onChange={e=>setResetEmail(e.target.value)}/></label><div><button onClick={()=>void issueReset()} disabled={!resetEmail}>Issue one-time reset token</button></div></div>}
        {resetToken&&<label>Reset token<input readOnly value={resetToken}/></label>}
      </>}
      <div className="tribunalcitegrid"><label>Current password<input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label>New password<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label></div><button onClick={()=>void changePassword()} disabled={!currentPassword||newPassword.length<10}>Change password & revoke sessions</button>
      <button onClick={()=>void signOut()}>Sign out</button>
    </>}
  </section>
}
