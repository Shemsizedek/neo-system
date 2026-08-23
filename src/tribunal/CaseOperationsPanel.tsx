import {useMemo,useState} from 'react'
import {CalendarClock,MailCheck,UserPlus,UsersRound} from 'lucide-react'
import type {TribunalCase} from './tribunalEngine'
import {appendAudit,createInvite,readAuditLedger,readInvites,readWorkspaceMembers,saveInvites,verifyAuditLedger,type WorkspaceRole} from './workspace'
import {createEFile,fileEFile,validateEFile,type ChaplaincyEFile} from './efile'
import {createHearing,createNotice,hearingConflicts,issueNotice,markNotice,scheduleHearing,type Hearing,type ServiceNotice} from './serviceAndHearings'

export function CaseOperationsPanel({caseFile}:{caseFile:TribunalCase}){
  const [members]=useState(()=>readWorkspaceMembers())
  const [invites,setInvites]=useState(()=>readInvites())
  const [inviteEmail,setInviteEmail]=useState('')
  const [inviteRole,setInviteRole]=useState<WorkspaceRole>('REVIEWER')
  const [ledger,setLedger]=useState(()=>readAuditLedger())
  const [ledgerState,setLedgerState]=useState('Not checked')
  const [efile,setEfile]=useState<ChaplaincyEFile>(()=>({...createEFile(),claimNo:caseFile.claimNo,petitioner:caseFile.petitioner.name,respondent:caseFile.respondent.name,petitionerTempleCouncil:caseFile.petitioner.council??'',respondentTempleCouncil:caseFile.respondent.council??'',petitionerLocation:caseFile.petitioner.location??'',respondentLocation:caseFile.respondent.location??'',email:caseFile.petitioner.email??'',respondentEmail:caseFile.respondent.email??'',statement:caseFile.statement}))
  const [notices,setNotices]=useState<ServiceNotice[]>([])
  const [hearings,setHearings]=useState<Hearing[]>([])
  const [hearingAt,setHearingAt]=useState('')
  const efileCheck=useMemo(()=>validateEFile(efile),[efile])

  const invite=async()=>{if(!inviteEmail.trim())return;const next=createInvite(inviteEmail,inviteRole,'Tribunal Administrator');const all=[...invites,next];saveInvites(all);setInvites(all);setInviteEmail('');await appendAudit('Tribunal Administrator','INVITE_ISSUED',next.email,`${next.role} workspace invitation`);setLedger(readAuditLedger())}
  const submitEFile=async()=>{const filed=fileEFile(efile);setEfile(filed);await appendAudit('E-File Intake','EFILE_FILED',filed.claimNo,filed.filingId);setLedger(readAuditLedger())}
  const makeNotice=()=>{const n=createNotice(caseFile.claimNo,caseFile.respondent.name,caseFile.respondent.email??'');setNotices(v=>[...v,n])}
  const sendNotice=async(id:string)=>{const current=notices.find(n=>n.noticeId===id);if(!current)return;const issued=issueNotice({...current,body:current.body||`You are given notice of internal Tribunal matter ${caseFile.claimNo}.`});const sent=markNotice(issued,'SENT','Electronic transmission recorded by internal workflow.');setNotices(v=>v.map(n=>n.noticeId===id?sent:n));await appendAudit('Tribunal Clerk','NOTICE_SENT',id,caseFile.claimNo);setLedger(readAuditLedger())}
  const schedule=async()=>{if(!hearingAt)return;let h=createHearing(caseFile.claimNo,hearingAt,[caseFile.petitioner.name,caseFile.respondent.name]);if(hearingConflicts(h,hearings).length)return;h=scheduleHearing(h);setHearings(v=>[...v,h]);await appendAudit('Tribunal Clerk','HEARING_SCHEDULED',h.hearingId,h.startsAt);setLedger(readAuditLedger())}
  const verify=async()=>{const result=await verifyAuditLedger();setLedgerState(result.valid?'VERIFIED':`REVIEW: ${result.reason}`)}

  return <>
    <section className="card panel">
      <div className="paneltitle"><div><span>Tribunal Workspace & Identity</span><small>Invitation-controlled internal collaboration with role assignments</small></div><UsersRound size={18}/></div>
      <div className="route"><span>MEMBERS</span><b>{members.filter(m=>m.status==='ACTIVE').length} active • {invites.filter(i=>i.status==='PENDING').length} pending invites</b></div>
      <div className="tribunalcitegrid"><label>Email<input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="reviewer@example.org"/></label><label>Role<select value={inviteRole} onChange={e=>setInviteRole(e.target.value as WorkspaceRole)}><option>JUDGE</option><option>CLERK</option><option>MARSHAL</option><option>REVIEWER</option><option>VIEWER</option></select></label></div>
      <button className="primary" onClick={()=>void invite()} disabled={!inviteEmail.trim()}><UserPlus size={15}/> Create invitation</button>
    </section>

    <section className="card panel">
      <div className="paneltitle"><div><span>World Chaplaincy E-File Intake</span><small>Required-field validation for Temple Injustice, Civil, Family and Finance filings</small></div><MailCheck size={18}/></div>
      <div className="tribunalcitegrid"><label>Case type<select value={efile.caseType} onChange={e=>setEfile(v=>({...v,caseType:e.target.value as ChaplaincyEFile['caseType']}))}><option value="TEMPLE_INJUSTICE">Temple Injustice</option><option value="CIVIL">Civil</option><option value="FAMILY">Family</option><option value="FINANCE">Finance</option></select></label><label>Claim No.<input value={efile.claimNo} onChange={e=>setEfile(v=>({...v,claimNo:e.target.value}))}/></label></div>
      <label>Statement<textarea rows={3} value={efile.statement} onChange={e=>setEfile(v=>({...v,statement:e.target.value}))}/></label>
      <div className="route"><span>VALIDATION</span><b>{efileCheck.valid?'READY TO FILE':`${efileCheck.problems.length} missing/invalid field(s)`}</b></div>
      <button className="primary" disabled={!efileCheck.valid||efile.status==='FILED'} onClick={()=>void submitEFile()}>{efile.status==='FILED'?'Filed':'File internal record'}</button>
    </section>

    <section className="focusgrid">
      <div className="card focus"><MailCheck size={24}/><h2>Notice & Service</h2><p>Issue and record service attempts without implying external service authority.</p><button onClick={makeNotice}>Create respondent notice</button>{notices.map(n=><div className="route" key={n.noticeId}><span>{n.status}</span><b>{n.noticeId}</b>{n.status==='DRAFT'&&<button onClick={()=>void sendNotice(n.noticeId)}>Issue & send</button>}</div>)}</div>
      <div className="card focus"><CalendarClock size={24}/><h2>Hearing Management</h2><p>Schedule internal hearings and detect time conflicts.</p><input type="datetime-local" value={hearingAt} onChange={e=>setHearingAt(e.target.value)}/><button onClick={()=>void schedule()} disabled={!hearingAt}>Schedule hearing</button>{hearings.map(h=><div className="route" key={h.hearingId}><span>{h.status}</span><b>{new Date(h.startsAt).toLocaleString()}</b></div>)}</div>
    </section>

    <section className="card panel"><div className="paneltitle"><div><span>Shared Audit Ledger</span><small>Append-only hash-linked activity record for workspace operations</small></div><UsersRound size={18}/></div><div className="route"><span>ENTRIES</span><b>{ledger.length} • {ledgerState}</b></div><button onClick={()=>void verify()}>Verify ledger chain</button></section>
  </>
}
