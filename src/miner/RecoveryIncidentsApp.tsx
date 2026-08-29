/// <reference types="vite/client" />
import React,{useEffect,useState} from 'react'
import {OperatorSessionPanel} from './OperatorSessionPanel'
import {operatorFetch,type OperatorSession} from './operatorSession'

type BitcoinEvidence={verified?:boolean;resolutionCode?:string;txid?:string;replacementTxid?:string;verifiedAt?:string;evidence?:Record<string,unknown>}
type Incident={id:string;payoutId?:string|null;state:string;reason:string;severity:string;source?:string;scope?:string;manualResolutionAllowed?:boolean;createdAt?:string;acknowledgedAt?:string;resolvedAt?:string;resolutionCode?:string;verifiedEvidence?:BitcoinEvidence}
type IncidentCtx={incident:Incident;payout?:{id:string;state:string;amountBtc:number;txid?:string|null;confirmations?:number};psbts?:{psbtId:string;feeBtc?:number;signingMode?:string;createdAt?:string}[];finalizedTransactions?:{psbtId:string;complete?:boolean;finalizedAt?:string}[];blocked:boolean}
type Payload={summary:{total:number;open:number;acknowledged:number;resolved:number;blocking:number};incidents:IncidentCtx[]}
type DriftPayload={state:string;holdFinancialMutations:boolean;reasons:string[];activeIncident:Incident|null;attestation?:{identity?:{buildCommitSha?:string;runtimeImageDigest?:string;authorizedCommitSha?:string;authorizedImageDigest?:string;environment?:string}}}
type ResolutionCode='TX_CONFIRMED'|'TX_NOT_BROADCAST'|'TX_REPLACED'

const short=(value?:string)=>value?`${value.slice(0,16)}…`:'missing'

export function RecoveryIncidentsApp(){
  const [data,setData]=useState<Payload|null>(null),[drift,setDrift]=useState<DriftPayload|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[session,setSession]=useState<OperatorSession|null>(null)
  const load=async()=>{if(!session)return;try{const [incidents,driftStatus]=await Promise.all([operatorFetch('/incidents'),operatorFetch('/runtime-drift')]);if(!incidents.ok)throw new Error(`Incident API ${incidents.status}`);if(!driftStatus.ok)throw new Error(`Runtime drift API ${driftStatus.status}`);setData(await incidents.json());setDrift(await driftStatus.json());setError('')}catch(e){setError(e instanceof Error?e.message:'Incident API unavailable')}}
  useEffect(()=>{if(!session)return;load();const t=setInterval(load,15000);return()=>clearInterval(t)},[session?.operator.id])
  const acknowledge=async(id:string)=>{if(!session){setError('Authenticated operator session is required.');return}const note=window.prompt('Acknowledgement note')||'';setBusy(id);try{const r=await operatorFetch(`/incidents/${encodeURIComponent(id)}/acknowledge`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({note})});const body=await r.json();if(!r.ok)throw new Error(body.error||`Incident API ${r.status}`);await load()}catch(e){setError(e instanceof Error?e.message:'Incident acknowledgement failed')}finally{setBusy('')}}
  const verifyAndResolve=async(id:string,resolutionCode:ResolutionCode)=>{if(!session){setError('Authenticated operator session is required.');return}const note=window.prompt('Operator note for the Bitcoin Core verification')||'';let replacementTxid:string|undefined;if(resolutionCode==='TX_REPLACED'){replacementTxid=window.prompt('Replacement Bitcoin transaction ID')?.trim();if(!replacementTxid)return}setBusy(id);try{const r=await operatorFetch(`/incidents/${encodeURIComponent(id)}/resolve`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({note,resolutionCode,replacementTxid})});const body=await r.json();if(!r.ok)throw new Error(body.error||`Bitcoin Core verification failed (${r.status})`);await load()}catch(e){setError(e instanceof Error?e.message:'Bitcoin Core verification failed')}finally{setBusy('')}}
  const summary=data?.summary,identity=drift?.attestation?.identity
  return <main style={{minHeight:'100vh',background:'#040706',color:'#e8fff0',padding:24,fontFamily:'system-ui'}}>
    <div style={{maxWidth:1180,margin:'0 auto'}}><h1>NEO Treasury Recovery Incidents</h1><p style={{maxWidth:900,color:'#9fc7ad'}}>Fail-closed operator control for Bitcoin recovery and runtime identity drift. Bitcoin payout holds can be released only after the backend independently verifies the requested condition with Bitcoin Core and persists the resulting evidence.</p>
      <OperatorSessionPanel onSession={setSession}/>
      {error&&<div style={{padding:12,border:'1px solid #734',borderRadius:8,margin:'12px 0'}}>{error}</div>}
      {!session?<p style={{marginTop:20,color:'#9fc7ad'}}>Sign in with a role allowed to view recovery incidents.</p>:<>
      <section style={{margin:'20px 0',padding:16,border:`1px solid ${drift?.holdFinancialMutations?'#a33':'#234b35'}`,borderRadius:12}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><b>Runtime Identity</b><div style={{color:'#9fc7ad'}}>{identity?.environment||'neo-miner-production'}</div></div><div style={{fontWeight:800}}>{drift?.holdFinancialMutations?'🚨 GLOBAL FINANCIAL HOLD':'✓ IDENTITY VERIFIED'}</div></div>
        <div style={{marginTop:10}}>State: {drift?.state||'unknown'} · Incident: {drift?.activeIncident?.id||'none'}</div>
        {drift?.reasons?.length?<div style={{marginTop:8,color:'#f0c0c0'}}>Reasons: {drift.reasons.join(', ')}</div>:null}
        <div style={{marginTop:10,color:'#9fc7ad'}}>Observed commit {short(identity?.buildCommitSha)} · authorized {short(identity?.authorizedCommitSha)}</div>
        <div style={{marginTop:4,color:'#9fc7ad'}}>Observed image {short(identity?.runtimeImageDigest)} · authorized {short(identity?.authorizedImageDigest)}</div>
        {drift?.activeIncident&&<div style={{marginTop:10}}>This incident is system-controlled. Manual release is disabled; verified remediation resolves it automatically.</div>}
      </section>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,margin:'20px 0'}}>{[['Total',summary?.total],['Open',summary?.open],['Acknowledged',summary?.acknowledged],['Resolved',summary?.resolved],['Blocking',summary?.blocking]].map(([k,v])=><div key={String(k)} style={{border:'1px solid #234b35',borderRadius:10,padding:14}}><small>{k}</small><div style={{fontSize:28,fontWeight:700}}>{v??'—'}</div></div>)}</section>
      <section style={{display:'grid',gap:12}}>{data?.incidents?.map(ctx=><article key={ctx.incident.id} style={{border:'1px solid #234b35',borderRadius:12,padding:16}}><div style={{display:'flex',gap:12,justifyContent:'space-between',flexWrap:'wrap'}}><div><b>{ctx.incident.id}</b> · {ctx.incident.severity} · {ctx.incident.state}<div style={{color:'#9fc7ad'}}>{ctx.incident.reason}</div></div><div>{ctx.blocked?'🔒 HOLD ACTIVE':'✓ HOLD RELEASED'}</div></div>
        {ctx.incident.source==='RUNTIME_IDENTITY'?<div style={{marginTop:12}}>Global runtime identity incident · verified remediation required.</div>:<div style={{marginTop:12}}>Payout: {ctx.payout?.id||ctx.incident.payoutId||'global'} · {ctx.payout?.state||'unknown'} · {ctx.payout?.amountBtc??'—'} BTC · txid {ctx.payout?.txid||'not recorded'} · confirmations {ctx.payout?.confirmations??0}</div>}
        <div style={{marginTop:8,color:'#9fc7ad'}}>PSBT records: {ctx.psbts?.length||0} · finalized records: {ctx.finalizedTransactions?.length||0}. Raw PSBT and transaction hex are not exposed here.</div>
        {ctx.incident.resolutionCode&&<div style={{marginTop:8}}>Resolution: {ctx.incident.resolutionCode}</div>}
        {ctx.incident.verifiedEvidence?.verifiedAt&&<div style={{marginTop:6,color:'#9fc7ad'}}>Bitcoin Core evidence verified {ctx.incident.verifiedEvidence.verifiedAt} · txid {short(ctx.incident.verifiedEvidence.txid)}{ctx.incident.verifiedEvidence.replacementTxid?` · replacement ${short(ctx.incident.verifiedEvidence.replacementTxid)}`:''}</div>}
        <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>{ctx.incident.state==='OPEN'&&ctx.incident.source!=='RUNTIME_IDENTITY'&&<button disabled={busy===ctx.incident.id} onClick={()=>acknowledge(ctx.incident.id)}>Acknowledge</button>}{ctx.incident.state!=='RESOLVED'&&ctx.incident.manualResolutionAllowed!==false&&ctx.incident.source!=='RUNTIME_IDENTITY'&&<><button disabled={busy===ctx.incident.id} onClick={()=>verifyAndResolve(ctx.incident.id,'TX_CONFIRMED')}>Verify Confirmed → Release</button><button disabled={busy===ctx.incident.id} onClick={()=>verifyAndResolve(ctx.incident.id,'TX_NOT_BROADCAST')}>Verify Not Broadcast → Release</button><button disabled={busy===ctx.incident.id} onClick={()=>verifyAndResolve(ctx.incident.id,'TX_REPLACED')}>Verify Replacement → Release</button></>}</div>
      </article>)}{data&&data.incidents.length===0&&<p>No recovery incidents recorded.</p>}</section></>}
      <p style={{marginTop:24,color:'#9fc7ad'}}>Security note: operator identity comes from the server session. Runtime drift incidents cannot be manually released, and Bitcoin payout incidents require Bitcoin Core evidence before their hold is removed.</p>
    </div>
  </main>
}
