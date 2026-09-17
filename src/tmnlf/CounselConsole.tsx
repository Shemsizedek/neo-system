import { useMemo, useState } from 'react'
import {
  AlertTriangle, Archive, BookOpen, CheckCircle2, ChevronRight, FileText,
  Gavel, Landmark, LockKeyhole, Plus, Scale, Search, ShieldCheck
} from 'lucide-react'
import './counsel-console.css'

type MatterStatus='INTAKE'|'RESEARCH'|'FACT_DEVELOPMENT'|'EVIDENCE_COLLECTION'|'DRAFTING'|'REVIEW'|'NEGOTIATION'|'RESOLVED'
type Matter={id:string;name:string;status:MatterStatus;priority:'NORMAL'|'HIGH'|'CRITICAL';jurisdiction:string;objective:string;evidence:number;authorities:number;nextAction:string}

const seedMatters:Matter[]=[
  {id:'TMNLF-001',name:'Institutional Governance Baseline',status:'RESEARCH',priority:'HIGH',jurisdiction:'Internal / jurisdiction mapping pending',objective:'Establish verified authority, governance boundaries and escalation rules for TMNLF operations.',evidence:4,authorities:7,nextAction:'Complete jurisdiction and authority verification matrix.'},
  {id:'TMNLF-002',name:'Digital Asset Compliance Framework',status:'FACT_DEVELOPMENT',priority:'HIGH',jurisdiction:'Multi-jurisdictional / unresolved',objective:'Separate technology, property, contract, securities and regulatory classifications before operational use.',evidence:3,authorities:5,nextAction:'Identify controlling regulator and offering facts before classification.'},
  {id:'TMNLF-003',name:'Evidence & Provenance Control',status:'EVIDENCE_COLLECTION',priority:'NORMAL',jurisdiction:'Internal operations',objective:'Standardize evidence intake, source references, verification status and chain-of-custody events.',evidence:9,authorities:2,nextAction:'Validate evidence-vault handoff and audit event format.'}
]

const statusLabel=(value:string)=>value.replaceAll('_',' ')

export function CounselConsole(){
  const[matters,setMatters]=useState(seedMatters)
  const[activeId,setActiveId]=useState(seedMatters[0].id)
  const[query,setQuery]=useState('')
  const[showIntake,setShowIntake]=useState(false)
  const[name,setName]=useState('')
  const[objective,setObjective]=useState('')

  const filtered=useMemo(()=>matters.filter(m=>`${m.id} ${m.name} ${m.objective}`.toLowerCase().includes(query.toLowerCase())),[matters,query])
  const active=matters.find(m=>m.id===activeId)??matters[0]
  const unresolved=matters.filter(m=>/unresolved|pending/i.test(m.jurisdiction)).length
  const evidenceCount=matters.reduce((n,m)=>n+m.evidence,0)
  const authorityCount=matters.reduce((n,m)=>n+m.authorities,0)

  function createDraft(){
    if(!name.trim()||!objective.trim()) return
    const nextNumber=String(matters.length+1).padStart(3,'0')
    const matter:Matter={id:`TMNLF-${nextNumber}`,name:name.trim(),status:'INTAKE',priority:'NORMAL',jurisdiction:'UNRESOLVED',objective:objective.trim(),evidence:0,authorities:0,nextAction:'Resolve jurisdiction before material legal conclusions.'}
    setMatters(prev=>[...prev,matter]);setActiveId(matter.id);setName('');setObjective('');setShowIntake(false)
  }

  return <div className="counsel-console">
    <aside className="counsel-side">
      <div className="counsel-brand"><div className="counsel-seal"><Scale size={21}/></div><div><b>TMNLF</b><span>Counsel Console v0.3</span></div></div>
      <button className="counsel-new" onClick={()=>setShowIntake(v=>!v)}><Plus size={16}/> New matter</button>
      <div className="counsel-nav-title">WORKSPACES</div>
      <nav className="counsel-nav">
        <button className="active"><Landmark size={16}/> Matters</button>
        <button><FileText size={16}/> Evidence index</button>
        <button><BookOpen size={16}/> Authority ledger</button>
        <button><Gavel size={16}/> Jurisdiction</button>
        <button><Archive size={16}/> Archive</button>
      </nav>
      <div className="counsel-boundary"><LockKeyhole size={15}/><span>Private by default. External model exports are minimum-necessary only.</span></div>
    </aside>

    <main className="counsel-main">
      <header className="counsel-header">
        <div><p>TAMEREAN NATURAL LAW FIRM</p><h1>NEOsync Counsel Console</h1></div>
        <div className="counsel-live"><i/> MATTER ENGINE ONLINE</div>
      </header>

      <section className="counsel-stats">
        <article><Scale/><div><strong>{matters.length}</strong><span>Active records</span></div></article>
        <article><FileText/><div><strong>{evidenceCount}</strong><span>Evidence items</span></div></article>
        <article><BookOpen/><div><strong>{authorityCount}</strong><span>Authorities tracked</span></div></article>
        <article className={unresolved?'warn':''}><AlertTriangle/><div><strong>{unresolved}</strong><span>Jurisdiction flags</span></div></article>
      </section>

      {showIntake&&<section className="counsel-intake">
        <div><span className="kicker">NEW MATTER INTAKE</span><h2>Open a controlled draft record</h2></div>
        <label>Matter name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Matter name"/></label>
        <label>Objective<textarea value={objective} onChange={e=>setObjective(e.target.value)} placeholder="Define the desired lawful outcome"/></label>
        <div className="intake-note"><ShieldCheck size={15}/> New matters begin with jurisdiction unresolved and require authority verification before material legal conclusions.</div>
        <button onClick={createDraft}>Create intake draft</button>
      </section>}

      <section className="counsel-layout">
        <div className="matter-list-panel">
          <div className="panel-head"><div><span className="kicker">MATTER DOCKET</span><h2>Open matters</h2></div><div className="searchbox"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search"/></div></div>
          <div className="matter-list">
            {filtered.map(m=><button key={m.id} className={m.id===active.id?'matter-row active':''} onClick={()=>setActiveId(m.id)}>
              <div><span className="matter-id">{m.id}</span><b>{m.name}</b><small>{statusLabel(m.status)}</small></div>
              <div className="matter-row-end"><span className={`priority ${m.priority.toLowerCase()}`}>{m.priority}</span><ChevronRight size={16}/></div>
            </button>)}
          </div>
        </div>

        <div className="matter-detail">
          <div className="detail-head"><div><span className="matter-id">{active.id}</span><h2>{active.name}</h2></div><span className="status-chip">{statusLabel(active.status)}</span></div>
          <div className="detail-block"><span className="kicker">OBJECTIVE</span><p>{active.objective}</p></div>
          <div className="detail-grid">
            <div><span className="kicker">JURISDICTION</span><p>{active.jurisdiction}</p></div>
            <div><span className="kicker">NEXT ACTION</span><p>{active.nextAction}</p></div>
          </div>
          <div className="record-metrics">
            <div><FileText size={17}/><strong>{active.evidence}</strong><span>Evidence</span></div>
            <div><BookOpen size={17}/><strong>{active.authorities}</strong><span>Authorities</span></div>
            <div><CheckCircle2 size={17}/><strong>5</strong><span>Classes enforced</span></div>
          </div>
          <div className="classification-band"><b>FACT</b><b>LAW</b><b>ARGUMENT</b><b>THEORY</b><b>UNKNOWN</b></div>
          <div className="review-gate"><ShieldCheck size={18}/><div><b>Human review gate active</b><p>Filings, service, admissions, waivers, settlements, releases, material asset dispositions and regulatory submissions require authorized human review.</p></div></div>
        </div>
      </section>
    </main>
  </div>
}
