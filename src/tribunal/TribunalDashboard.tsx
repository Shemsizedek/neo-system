import {useMemo,useState} from 'react'
import {BookOpen,CheckCircle2,FileText,Gavel,Link2,Scale,ShieldCheck} from 'lucide-react'
import {corpusRecords} from '../corpus/corpusData'
import {corpusSources,makeCitation,sourcesForAuthority} from '../corpus/sourceStore'
import {addCitationToCase,advanceCase,caseReadiness,citationMatrix,tribunalCases,type TribunalCase} from './tribunalEngine'

export function TribunalDashboard(){
  const [caseFile,setCaseFile]=useState<TribunalCase>(tribunalCases[0])
  const [authorityId,setAuthorityId]=useState('NLC-CON-001')
  const [sourceId,setSourceId]=useState('SRC-CON-001-ACT1')
  const [proposition,setProposition]=useState('Act 1 is cited as an internal Temple governance authority.')
  const readiness=useMemo(()=>caseReadiness(caseFile),[caseFile])
  const matrix=useMemo(()=>citationMatrix(caseFile),[caseFile])
  const availableSources=sourcesForAuthority(authorityId)
  const authority=corpusRecords.find(item=>item.id===authorityId)

  const attach=()=>{
    const selectedSource=corpusSources.find(item=>item.sourceId===sourceId)
    if(!selectedSource) return
    const citation=makeCitation({
      authorityId,
      sourceId,
      locator:selectedSource.locator ?? selectedSource.title,
      proposition,
    })
    setCaseFile(current=>addCitationToCase(current,citation))
  }

  return <>
    <section className="stats">
      <div className="card stat"><div><span>Claim No.</span><strong>{caseFile.claimNo}</strong><small>{caseFile.caseType.replaceAll('_',' ')}</small></div><Gavel size={22}/></div>
      <div className="card stat"><div><span>Case Status</span><strong>{caseFile.status.replaceAll('_',' ')}</strong><small>Controlled lifecycle</small></div><Scale size={22}/></div>
      <div className="card stat"><div><span>Evidence</span><strong>{caseFile.evidenceItems}</strong><small>Recorded evidence items</small></div><FileText size={22}/></div>
      <div className="card stat"><div><span>Authorities</span><strong>{caseFile.citations.length}</strong><small>Validated Corpus citations</small></div><BookOpen size={22}/></div>
    </section>

    <section className="focusgrid">
      <div className="card focus"><Gavel size={26}/><h2>Case Review Pipeline</h2><p>Intake → jurisdiction review → notice → evidence → record close → NEOsync opinion → authorized disposition.</p><p><b>Readiness:</b> parties {readiness.hasParties?'✓':'—'} • statement {readiness.hasStatement?'✓':'—'} • evidence {readiness.evidenceItems} • authority {readiness.hasAuthority?'✓':'—'}</p><button className="primary" onClick={()=>setCaseFile(current=>advanceCase(current))}>Advance demonstration docket</button></div>
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
      <div className="paneltitle"><div><span>Case Authority Matrix</span><small>Authority-source-proposition chain for the record</small></div><CheckCircle2 size={18}/></div>
      <div className="tablewrap"><table><thead><tr><th>Citation</th><th>Authority</th><th>Source</th><th>Proposition</th><th>Integrity</th></tr></thead><tbody>{matrix.length?matrix.map(({citation,validation})=><tr key={citation.citationId}><td className="mono">{citation.citationId}</td><td>{citation.authorityId}</td><td>{citation.sourceId}</td><td>{citation.proposition}</td><td><span className={'pill '+(validation.valid?'completed':'manual_review')}>{validation.valid?'VALID':'REVIEW'}</span></td></tr>):<tr><td colSpan={5}>No Corpus authorities attached to this docket yet.</td></tr>}</tbody></table></div>
    </section>
  </>
}
