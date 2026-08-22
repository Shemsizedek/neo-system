import {useMemo,useState} from 'react'
import {FileDown,FileKey2,HardDrive,History,LockKeyhole,Scale,ShieldCheck,UserRoundCheck} from 'lucide-react'
import type {TribunalCase} from './tribunalEngine'
import {replaceEvidence} from './tribunalEngine'
import type {TribunalOpinion} from './opinionBuilder'
import {attachEvidenceFile} from './evidenceEngine'
import {buildOpinionPacket,createFinding,issueCustodyReceipt,renderPacket,validateFinding,type BurdenStandard,type CustodyReceipt,type FindingOfFact} from './evidencePacket'
import {can,roleLabels,type TribunalPrincipal,type TribunalRole} from './rbac'
import {readDocketHistory,recoverEncryptedEvidence,saveDocketVersion,storeEncryptedEvidence,verifyDocketVersion,type DocketVersion} from './persistence'
import {downloadPdf} from './pdfPacket'

export function TribunalPacketPanel({caseFile,setCaseFile,opinion}:{caseFile:TribunalCase;setCaseFile:(updater:(current:TribunalCase)=>TribunalCase)=>void;opinion:TribunalOpinion}){
  const [findingText,setFindingText]=useState('')
  const [rationale,setRationale]=useState('')
  const [burden,setBurden]=useState<BurdenStandard>('INTERNAL_EQUITY_REVIEW')
  const [findings,setFindings]=useState<FindingOfFact[]>([])
  const [receipts,setReceipts]=useState<CustodyReceipt[]>([])
  const [packetPreview,setPacketPreview]=useState('')
  const [passphrase,setPassphrase]=useState('')
  const [storageMessage,setStorageMessage]=useState('')
  const [history,setHistory]=useState<DocketVersion[]>(()=>readDocketHistory(caseFile.claimNo))
  const [principal,setPrincipal]=useState<TribunalPrincipal>({principalId:'local-grand-sheik',displayName:'NEO Tribunal Operator',role:'GRAND_SHEIK'})

  const admitted=useMemo(()=>caseFile.evidence.filter(e=>e.status==='ADMITTED'),[caseFile.evidence])
  const findingChecks=useMemo(()=>findings.map(f=>({finding:f,check:validateFinding(f,caseFile.citations,caseFile.evidence)})),[findings,caseFile.citations,caseFile.evidence])

  const addFinding=()=>{
    if(!can(principal,'FINDINGS_WRITE')||!findingText.trim()||!rationale.trim()) return
    setFindings(current=>[...current,createFinding({proposition:findingText,status:'PROPOSED',burden,exhibitIds:admitted.map(e=>e.exhibitId),citationIds:caseFile.citations.map(c=>c.citationId),rationale},current.length+1)])
    setFindingText('');setRationale('')
  }

  const hashFile=async(exhibitId:string,file:File)=>{
    if(!can(principal,'EVIDENCE_WRITE'))return
    const item=caseFile.evidence.find(e=>e.exhibitId===exhibitId);if(!item)return
    const next=await attachEvidenceFile(item,file);setCaseFile(current=>replaceEvidence(current,next))
    if(passphrase.length>=8){await storeEncryptedEvidence(caseFile.claimNo,exhibitId,file,passphrase);setStorageMessage(`${exhibitId} encrypted with AES-GCM and stored on this device.`)}
  }

  const recover=async(exhibitId:string)=>{
    try{const file=await recoverEncryptedEvidence(caseFile.claimNo,exhibitId,passphrase);const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStorageMessage(`${exhibitId} decrypted after authenticated local retrieval.`)}catch(error){setStorageMessage(error instanceof Error?error.message:'Unable to recover exhibit.')}
  }

  const receipt=async(exhibitId:string)=>{
    if(!can(principal,'AUDIT_SIGN'))return
    const item=caseFile.evidence.find(e=>e.exhibitId===exhibitId);if(!item)return
    const next=await issueCustodyReceipt(item);setReceipts(current=>current.some(r=>r.exhibitId===exhibitId)?current:[...current,next])
  }

  const buildPacket=async()=>{
    if(!can(principal,'PACKET_EXPORT'))return
    const packet=await buildOpinionPacket({claimNo:caseFile.claimNo,opinion,findings,citations:caseFile.citations,exhibits:caseFile.evidence});setPacketPreview(renderPacket(packet,receipts))
  }

  const saveVersion=async()=>{
    if(!can(principal,'DOCKET_VERSION'))return
    const version=await saveDocketVersion(caseFile,principal);setHistory(readDocketHistory(caseFile.claimNo));setStorageMessage(`Docket v${version.version} signed and persisted. ${version.hash.slice(0,18)}…`)
  }

  const verifyVersion=async(version:DocketVersion)=>setStorageMessage(`Docket v${version.version} signature ${await verifyDocketVersion(version)?'VERIFIED':'FAILED'}.`)
  const loadVersion=(version:DocketVersion)=>{if(can(principal,'CASE_WRITE'))setCaseFile(()=>structuredClone(version.caseFile))}
  const exportPdf=()=>{if(can(principal,'PACKET_EXPORT')&&packetPreview)downloadPdf(`${caseFile.claimNo}-tribunal-opinion-packet.pdf`,opinion.title,packetPreview)}

  return <>
    <section className="card panel">
      <div className="paneltitle"><div><span>Tribunal Access Control</span><small>Local role policy gates write, admission, signing, versioning and export actions</small></div><UserRoundCheck size={18}/></div>
      <div className="tribunalcitegrid"><label>Active role<select value={principal.role} onChange={e=>setPrincipal(current=>({...current,role:e.target.value as TribunalRole}))}>{Object.entries(roleLabels).map(([role,label])=><option key={role} value={role}>{label}</option>)}</select></label><label>Operator<input value={principal.displayName} onChange={e=>setPrincipal(current=>({...current,displayName:e.target.value}))}/></label></div>
      <div className="route"><span>PERMISSIONS</span><b>{can(principal,'EVIDENCE_WRITE')?'evidence-write ':''}{can(principal,'FINDINGS_WRITE')?'findings ':''}{can(principal,'PACKET_EXPORT')?'export ':''}{can(principal,'AUDIT_SIGN')?'audit-sign':''}</b></div>
    </section>

    <section className="card tablecard">
      <div className="paneltitle"><div><span>Encrypted Evidence Vault</span><small>SHA-256 integrity plus AES-GCM encrypted local persistence in IndexedDB</small></div><LockKeyhole size={18}/></div>
      <label>Evidence vault passphrase<input type="password" value={passphrase} onChange={e=>setPassphrase(e.target.value)} placeholder="8+ characters; not stored"/></label>
      <div className="tablewrap"><table><thead><tr><th>Exhibit</th><th>File</th><th>SHA-256</th><th>Custody receipt</th><th>Vault</th></tr></thead><tbody>{caseFile.evidence.length?caseFile.evidence.map(item=><tr key={item.exhibitId}><td className="mono">{item.exhibitId}</td><td><input disabled={!can(principal,'EVIDENCE_WRITE')} type="file" onChange={e=>{const file=e.target.files?.[0];if(file)void hashFile(item.exhibitId,file)}}/><small>{item.fileName??'No file attached'}</small></td><td className="mono">{item.fingerprint?`${item.fingerprint.slice(0,18)}…`:'UNHASHED'}</td><td>{item.fingerprint?<button disabled={!can(principal,'AUDIT_SIGN')} onClick={()=>void receipt(item.exhibitId)}>{receipts.some(r=>r.exhibitId===item.exhibitId)?'Receipt issued':'Issue receipt'}</button>:'Hash first'}</td><td><button disabled={passphrase.length<8} onClick={()=>void recover(item.exhibitId)}>Decrypt copy</button></td></tr>):<tr><td colSpan={5}>Register an exhibit before attaching a file.</td></tr>}</tbody></table></div>
      {storageMessage&&<p className="sourcehint">{storageMessage}</p>}
    </section>

    <section className="card panel">
      <div className="paneltitle"><div><span>Docket Filing & Version History</span><small>Signed, hash-chained case snapshots persist across browser sessions</small></div><History size={18}/></div>
      <button className="primary" disabled={!can(principal,'DOCKET_VERSION')} onClick={()=>void saveVersion()}>File signed docket version</button>
      <div className="tablewrap"><table><thead><tr><th>Version</th><th>Filed</th><th>Actor</th><th>Hash</th><th>Actions</th></tr></thead><tbody>{history.length?history.slice().reverse().map(version=><tr key={version.version}><td>v{version.version}</td><td>{new Date(version.createdAt).toLocaleString()}</td><td>{version.actor}</td><td className="mono">{version.hash.slice(0,16)}…</td><td><button onClick={()=>void verifyVersion(version)}>Verify</button> <button disabled={!can(principal,'CASE_WRITE')} onClick={()=>loadVersion(version)}>Load</button></td></tr>):<tr><td colSpan={5}>No persistent docket versions filed on this device.</td></tr>}</tbody></table></div>
    </section>

    <section className="card panel">
      <div className="paneltitle"><div><span>Findings of Fact & Burden Standard</span><small>Every finding must identify its evidentiary basis and review standard</small></div><Scale size={18}/></div>
      <label>Standard<select disabled={!can(principal,'FINDINGS_WRITE')} value={burden} onChange={e=>setBurden(e.target.value as BurdenStandard)}><option value="INTERNAL_EQUITY_REVIEW">Internal equity review</option><option value="PREPONDERANCE">Preponderance</option><option value="CLEAR_AND_CONVINCING">Clear and convincing</option><option value="BEYOND_REASONABLE_DOUBT">Beyond reasonable doubt</option></select></label>
      <label>Proposed finding<textarea disabled={!can(principal,'FINDINGS_WRITE')} rows={2} value={findingText} onChange={e=>setFindingText(e.target.value)} placeholder="State one factual proposition supported by the record."/></label>
      <label>Rationale<textarea disabled={!can(principal,'FINDINGS_WRITE')} rows={2} value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="Explain why the cited record supports or does not support the finding."/></label>
      <button className="primary" disabled={!can(principal,'FINDINGS_WRITE')||!findingText.trim()||!rationale.trim()} onClick={addFinding}>Add proposed finding</button>
      <div className="tablewrap"><table><thead><tr><th>Finding</th><th>Standard</th><th>Evidence</th><th>Authorities</th><th>Validation</th></tr></thead><tbody>{findingChecks.length?findingChecks.map(({finding,check})=><tr key={finding.findingId}><td><b className="mono">{finding.findingId}</b><br/>{finding.proposition}</td><td>{finding.burden.replaceAll('_',' ')}</td><td>{finding.exhibitIds.length}</td><td>{finding.citationIds.length}</td><td><span className={'pill '+(check.valid?'completed':'manual_review')}>{check.valid?'VALID':'REVIEW'}</span></td></tr>):<tr><td colSpan={5}>No findings drafted.</td></tr>}</tbody></table></div>
    </section>

    <section className="card panel">
      <div className="paneltitle"><div><span>Opinion Packet + PDF</span><small>Manifest, findings, exhibits, receipts and opinion sealed by packet fingerprint</small></div><FileDown size={18}/></div>
      <div className="route"><span>PACKET READINESS</span><b>{findings.length} findings • {receipts.length} receipts • {caseFile.evidence.filter(e=>e.fingerprint).length}/{caseFile.evidence.length} hashed exhibits</b></div>
      <button className="primary" disabled={!can(principal,'PACKET_EXPORT')} onClick={()=>void buildPacket()}>Build packet manifest</button>
      <button className="primary" disabled={!packetPreview||!can(principal,'PACKET_EXPORT')} onClick={exportPdf}><FileDown size={16}/> Generate PDF opinion packet</button>
      <label>Packet preview<textarea readOnly rows={18} value={packetPreview} placeholder="Build the packet to generate the manifest and SHA-256 fingerprint."/></label>
      <div className="boundary"><ShieldCheck size={14}/><span>Encrypted storage, signatures, docket versioning and PDF generation protect internal record integrity. They do not by themselves create external jurisdiction or legal effect.</span></div>
    </section>
  </>
}
