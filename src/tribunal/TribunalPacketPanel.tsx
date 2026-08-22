import {useMemo,useState} from 'react'
import {FileCheck2,FileDown,FileKey2,Scale,ShieldCheck} from 'lucide-react'
import type {TribunalCase} from './tribunalEngine'
import {replaceEvidence} from './tribunalEngine'
import type {TribunalOpinion} from './opinionBuilder'
import {attachEvidenceFile} from './evidenceEngine'
import {buildOpinionPacket,createFinding,issueCustodyReceipt,renderPacket,validateFinding,type BurdenStandard,type CustodyReceipt,type FindingOfFact} from './evidencePacket'

export function TribunalPacketPanel({caseFile,setCaseFile,opinion}:{caseFile:TribunalCase;setCaseFile:(updater:(current:TribunalCase)=>TribunalCase)=>void;opinion:TribunalOpinion}){
  const [findingText,setFindingText]=useState('')
  const [rationale,setRationale]=useState('')
  const [burden,setBurden]=useState<BurdenStandard>('INTERNAL_EQUITY_REVIEW')
  const [findings,setFindings]=useState<FindingOfFact[]>([])
  const [receipts,setReceipts]=useState<CustodyReceipt[]>([])
  const [packetPreview,setPacketPreview]=useState('')

  const admitted=useMemo(()=>caseFile.evidence.filter(e=>e.status==='ADMITTED'),[caseFile.evidence])
  const findingChecks=useMemo(()=>findings.map(f=>({finding:f,check:validateFinding(f,caseFile.citations,caseFile.evidence)})),[findings,caseFile.citations,caseFile.evidence])

  const addFinding=()=>{
    if(!findingText.trim()||!rationale.trim()) return
    setFindings(current=>[...current,createFinding({proposition:findingText,status:'PROPOSED',burden,exhibitIds:admitted.map(e=>e.exhibitId),citationIds:caseFile.citations.map(c=>c.citationId),rationale},current.length+1)])
    setFindingText('');setRationale('')
  }

  const hashFile=async(exhibitId:string,file:File)=>{
    const item=caseFile.evidence.find(e=>e.exhibitId===exhibitId)
    if(!item)return
    const next=await attachEvidenceFile(item,file)
    setCaseFile(current=>replaceEvidence(current,next))
  }

  const receipt=async(exhibitId:string)=>{
    const item=caseFile.evidence.find(e=>e.exhibitId===exhibitId)
    if(!item)return
    const next=await issueCustodyReceipt(item)
    setReceipts(current=>current.some(r=>r.exhibitId===exhibitId)?current:[...current,next])
  }

  const buildPacket=async()=>{
    const packet=await buildOpinionPacket({claimNo:caseFile.claimNo,opinion,findings,citations:caseFile.citations,exhibits:caseFile.evidence})
    setPacketPreview(renderPacket(packet,receipts))
  }

  return <>
    <section className="card tablecard">
      <div className="paneltitle"><div><span>File-backed Evidence Integrity</span><small>Hash local evidence bytes and issue cryptographic custody receipts</small></div><FileKey2 size={18}/></div>
      <div className="tablewrap"><table><thead><tr><th>Exhibit</th><th>File</th><th>SHA-256</th><th>Custody receipt</th></tr></thead><tbody>{caseFile.evidence.length?caseFile.evidence.map(item=><tr key={item.exhibitId}><td className="mono">{item.exhibitId}</td><td><input type="file" onChange={e=>{const file=e.target.files?.[0];if(file)void hashFile(item.exhibitId,file)}}/><small>{item.fileName??'No file attached'}</small></td><td className="mono">{item.fingerprint?`${item.fingerprint.slice(0,18)}…`:'UNHASHED'}</td><td>{item.fingerprint?<button onClick={()=>void receipt(item.exhibitId)}>{receipts.some(r=>r.exhibitId===item.exhibitId)?'Receipt issued':'Issue receipt'}</button>:'Hash first'}</td></tr>):<tr><td colSpan={4}>Register an exhibit before attaching a file.</td></tr>}</tbody></table></div>
    </section>

    <section className="card panel">
      <div className="paneltitle"><div><span>Findings of Fact & Burden Standard</span><small>Every finding must identify its evidentiary basis and review standard</small></div><Scale size={18}/></div>
      <label>Standard<select value={burden} onChange={e=>setBurden(e.target.value as BurdenStandard)}><option value="INTERNAL_EQUITY_REVIEW">Internal equity review</option><option value="PREPONDERANCE">Preponderance</option><option value="CLEAR_AND_CONVINCING">Clear and convincing</option><option value="BEYOND_REASONABLE_DOUBT">Beyond reasonable doubt</option></select></label>
      <label>Proposed finding<textarea rows={2} value={findingText} onChange={e=>setFindingText(e.target.value)} placeholder="State one factual proposition supported by the record."/></label>
      <label>Rationale<textarea rows={2} value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="Explain why the cited record supports or does not support the finding."/></label>
      <button className="primary" disabled={!findingText.trim()||!rationale.trim()} onClick={addFinding}>Add proposed finding</button>
      <div className="tablewrap"><table><thead><tr><th>Finding</th><th>Standard</th><th>Evidence</th><th>Authorities</th><th>Validation</th></tr></thead><tbody>{findingChecks.length?findingChecks.map(({finding,check})=><tr key={finding.findingId}><td><b className="mono">{finding.findingId}</b><br/>{finding.proposition}</td><td>{finding.burden.replaceAll('_',' ')}</td><td>{finding.exhibitIds.length}</td><td>{finding.citationIds.length}</td><td><span className={'pill '+(check.valid?'completed':'manual_review')}>{check.valid?'VALID':'REVIEW'}</span></td></tr>):<tr><td colSpan={5}>No findings drafted.</td></tr>}</tbody></table></div>
    </section>

    <section className="card panel">
      <div className="paneltitle"><div><span>Exportable Opinion Packet</span><small>Manifest, findings, exhibits, receipts and opinion are sealed by a packet fingerprint</small></div><FileDown size={18}/></div>
      <div className="route"><span>PACKET READINESS</span><b>{findings.length} findings • {receipts.length} receipts • {caseFile.evidence.filter(e=>e.fingerprint).length}/{caseFile.evidence.length} hashed exhibits</b></div>
      <button className="primary" onClick={()=>void buildPacket()}>Build packet manifest</button>
      <label>Packet preview<textarea readOnly rows={18} value={packetPreview} placeholder="Build the packet to generate the manifest and SHA-256 fingerprint."/></label>
      <div className="boundary"><ShieldCheck size={14}/><span>Packet generation creates an internal record bundle and integrity manifest. It does not itself establish external jurisdiction or legal effect.</span></div>
    </section>
  </>
}
