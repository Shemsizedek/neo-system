import {useMemo,useState} from 'react'
import {BookOpen,CheckCircle2,FileText,Gavel,Link2,Scale,ShieldCheck} from 'lucide-react'
import {corpusRecords} from '../corpus/corpusData'
import {corpusSources,makeCitation,sourcesForAuthority} from '../corpus/sourceStore'
import {createEvidence,evidenceStats,setEvidenceStatus,type EvidenceKind} from './evidenceEngine'
import {createOpinion,renderOpinionText,updateOpinionSection,validateOpinion,type TribunalOpinion} from './opinionBuilder'
import {addCitationToCase,addEvidenceToCase,advanceCase,caseReadiness,citationMatrix,replaceEvidence,tribunalCases,type TribunalCase} from './tribunalEngine'
import {TribunalPacketPanel} from './TribunalPacketPanel'

export function TribunalDashboard(){
  const [caseFile,setCaseFile]=useState<TribunalCase>(tribunalCases[0])
  const [authorityId,setAuthorityId]=useState('NLC-CON-001')
  const [sourceId,setSourceId]=useState('SRC-CON-001-ACT1')
  const [proposition,setProposition]=useState('Act 1 is cited as an internal Temple governance authority.')
  const [evidenceTitle,setEvidenceTitle]=useState('')
  const [evidenceDescription,setEvidenceDescription]=useState('')
  const [evidenceKind,setEvidenceKind]=useState<EvidenceKind>('DOCUMENT')
  const [opinion,setOpinion]=useState<TribunalOpinion>(()=>createOpinion(tribunalCases[0].claimNo))
  const readiness=useMemo(()=>caseReadiness(caseFile),[caseFile])
  const matrix=useMemo(()=>citationMatrix(caseFile),[caseFile])
  const evStats=useMemo(()=>evidenceStats(caseFile.evidence),[caseFile.evidence])
  const opinionValidation=useMemo(()=>validateOpinion(opinion,caseFile.citations,caseFile.evidence),[opinion,caseFile.citations,caseFile.evidence])
  const availableSources=sourcesForAuthority(authorityId)
  const authority=corpusRecords.find(item=>item.id===authorityId)

  const attach=()=>{
    const selectedSource=corpusSources.find(item=>item.sourceId===sourceId)
    if(!selectedSource) return
    const citation=makeCitation({authorityId,sourceId,locator:selectedSource.locator ?? selectedSource.title,proposition})
    setCaseFile(current=>addCitationToCase(current,citation))
  }

  const addExhibit=()=>{
    if(!evidenceTitle.trim() || !evidenceDescription.trim()) return
    const exhibit=createEvidence({title:evidenceTitle,kind:evidenceKind,offeredBy:'TRIBUNAL',description:evidenceDescription,tags:['working-record']},caseFile.evidence.length+1)
    setCaseFile(current=>addEvidenceToCase(current,exhibit))
    setEvidenceTitle('');setEvidenceDescription('')
  }

  const admit=(exhibitId:string)=>setCaseFile(current=>{
    const item=current.evidence.find(e=>e.exhibitId===exhibitId)
    return item?replaceEvidence(current,setEvidenceStatus(item,'ADMITTED')):current
  })

  const setSection=(sectionId:string,body:string)=>setOpinion(current=>updateOpinionSection(current,sectionId,{body}))
  const linkRecordToAnalysis=()=>setOpinion(current=>updateOpinionSection(current,'SEC-ANALYSIS',{citationIds:caseFile.citations.map(c=>c.citationId),exhibitIds:caseFile.evidence.filter(e=>e.status==='ADMITTED').map(e=>e.exhibitId)}))

  return <>
    <section className="stats">
      <div className="card stat"><div><span>Claim No.</span><strong>{caseFile.claimNo}</strong><small>{caseFile.caseType.replaceAll('_',' ')}</small></div><Gavel size={22}/></div>
      <div className="card stat"><div><span>Case Status</span><strong>{caseFile.status.replaceAll('_',' ')}</strong><small>Controlled lifecycle</small></div><Scale size={22}/></div>
      <div className="card stat"><div><span>Evidence</span><strong>{evStats.total}</strong><small>{evStats.admitted} admitted • {evStats.hashed} hashed</small></div><FileText size={22}/></div>
      <div className="card stat"><div><span>Authorities</span><strong>{caseFile.citations.length}</strong><small>Validated Corpus citations</small></div><BookOpen size={22}/></div>
    </section>

    <section className="focusgrid">
      <div className="card focus"><Gavel size={26}/><h2>Case Review Pipeline</h2><p>Intake → jurisdiction review → notice → evidence → record close → NEOsync opinion → authorized internal disposition.</p><p><b>Readiness:</b> parties {readiness.hasParties?'✓':'—'} • statement {readiness.hasStatement?'✓':'—'} • evidence {readiness.evidenceItems} • authority {readiness.hasAuthority?'✓':'—'}</p><button className="primary" onClick={()=>setCaseFile(current=>advanceCase(current))}>Advance demonstration docket</button></div>
      <div className="card focus"><ShieldCheck size={26}/><h2>Due Process Boundary</h2><p>The Tribunal module is an internal records, analysis and adjudicative-workflow system. Software does not create external court jurisdiction, arrest power or governmental recognition.</p><p><b>Record closure:</b> {readiness.canCloseRecord?'eligible when lifecycle reaches record close':'additional record material required'}</p></div>
    </section>

    <section className="card panel">
      <div className="paneltitle"><div><span>Attach Corpus Authority</span><small>Every Tribunal proposition links to a specific authority and source object</small></div><Link2 size={18}/></div>
      <div className="tribunalcitegrid">
        <label>Authority<select value={authorityId} onChange={e=>{const next=e.target.value;setAuthorityId(next);const first=sourcesForAuthority(next)[0];setSourceId(first?.sourceId??'')}}>{corpusRecords.filter(r=>sourcesForAuthority(r.id).length).map(r=><option value={r.id} key={r.id}>{r.id} — {r.shortTitle??r.title}</option>)}</select></label>
        <label>Source<select value={sourceId} onChange={e=>setSourceId(e.target.value)}>{availableSources.map(s=><option value={s.sourceId} key={s.sourceId}>{s.sourceId} — {s.title}</option>)}</select></label>
      </div>
      <label>Proposition<textarea value={proposition} onChange={e=>setProposition(e.target.value)} rows={3}/></label>
      <div className="route"><span>LINK</span><b>{authority?.id??'—'} → {sourceId||'select source'} → {caseFile.claimNo}</b></div>
      <button className="primary" disabled={!sourceId || !proposition.trim()} onClick={attach}>Attach validated citation</button>
    </section>

    <section className="card tablecard">
      <div className="paneltitle"><div><span>Evidence & Exhibit Registry</span><small>Exhibit identity, status and chain-of-custody foundation</small></div><FileText size={18}/></div>
      <div className="tribunalcitegrid">
        <label>Title<input value={evidenceTitle} onChange={e=>setEvidenceTitle(e.target.value)} placeholder="Exhibit title"/></label>
        <label>Kind<select value={evidenceKind} onChange={e=>setEvidenceKind(e.target.value as EvidenceKind)}><option>DOCUMENT</option><option>AFFIDAVIT</option><option>CORRESPONDENCE</option><option>FINANCIAL_RECORD</option><option>IMAGE</option><option>AUDIO_VIDEO</option><option>TESTIMONY</option><option>OTHER</option></select></label>
      </div>
      <label>Description<textarea value={evidenceDescription} onChange={e=>setEvidenceDescription(e.target.value)} rows={2}/></label>
      <button className="primary" disabled={!evidenceTitle.trim()||!evidenceDescription.trim()} onClick={addExhibit}>Register exhibit</button>
      <div className="tablewrap"><table><thead><tr><th>Exhibit</th><th>Title</th><th>Kind</th><th>Status</th><th>Integrity</th><th>Custody</th><th>Action</th></tr></thead><tbody>{caseFile.evidence.map(item=><tr key={item.exhibitId}><td className="mono">{item.exhibitId}</td><td>{item.title}</td><td>{item.kind}</td><td>{item.status}</td><td>{item.integrity}</td><td>{item.custody.length} events</td><td>{item.status!=='ADMITTED'?<button onClick={()=>admit(item.exhibitId)}>Admit</button>:'—'}</td></tr>)}</tbody></table></div>
    </section>

    <TribunalPacketPanel caseFile={caseFile} setCaseFile={setCaseFile} opinion={opinion}/>

    <section className="card tablecard">
      <div className="paneltitle"><div><span>Case Authority Matrix</span><small>Authority-source-proposition chain for the record</small></div><CheckCircle2 size={18}/></div>
      <div className="tablewrap"><table><thead><tr><th>Citation</th><th>Authority</th><th>Source</th><th>Proposition</th><th>Integrity</th></tr></thead><tbody>{matrix.length?matrix.map(({citation,validation})=><tr key={citation.citationId}><td className="mono">{citation.citationId}</td><td>{citation.authorityId}</td><td>{citation.sourceId}</td><td>{citation.proposition}</td><td><span className={'pill '+(validation.valid?'completed':'manual_review')}>{validation.valid?'VALID':'REVIEW'}</span></td></tr>):<tr><td colSpan={5}>No Corpus authorities attached to this docket yet.</td></tr>}</tbody></table></div>
    </section>

    <section className="card panel">
      <div className="paneltitle"><div><span>NEOsync Opinion Builder</span><small>Draft findings and analysis with proposition-level authority and exhibit links</small></div><Gavel size={18}/></div>
      <label>Analysis<textarea rows={5} value={opinion.sections.find(s=>s.id==='SEC-ANALYSIS')?.body??''} onChange={e=>setSection('SEC-ANALYSIS',e.target.value)} placeholder="Analyze the record, distinguish allegations from findings, and explain the authority used."/></label>
      <label>Conclusion<textarea rows={3} value={opinion.sections.find(s=>s.id==='SEC-CONCLUSION')?.body??''} onChange={e=>setSection('SEC-CONCLUSION',e.target.value)} placeholder="State the internal Tribunal conclusion."/></label>
      <button className="primary" onClick={linkRecordToAnalysis}>Link admitted record to analysis</button>
      <div className="route"><span>VALIDATION</span><b>{opinionValidation.valid?'READY FOR INTERNAL REVIEW':`${opinionValidation.problems.length} issue(s)`}</b></div>
      {!opinionValidation.valid&&<ul>{opinionValidation.problems.map(problem=><li key={problem}>{problem}</li>)}</ul>}
      <label>Rendered opinion preview<textarea readOnly rows={16} value={renderOpinionText(opinion,caseFile.citations,caseFile.evidence)}/></label>
    </section>
  </>
}
