/// <reference types="vite/client" />
import React,{useEffect,useState} from 'react'
import {OperatorSessionPanel} from './OperatorSessionPanel'
import {operatorFetch,type OperatorSession} from './operatorSession'

type IncidentCtx={incident:{id:string;payoutId:string;state:string;reason:string;severity:string;createdAt?:string;acknowledgedAt?:string;resolvedAt?:string;resolutionCode?:string};payout?:{id:string;state:string;amountBtc:number;txid?:string|null;confirmations?:number};psbts?:{psbtId:string;feeBtc?:number;signingMode?:string;createdAt?:string}[];finalizedTransactions?:{psbtId:string;complete?:boolean;finalizedAt?:string}[];blocked:boolean}
type Payload={summary:{total:number;open:number;acknowledged:number;resolved:number;blocking:number};incidents:IncidentCtx[]}

export function RecoveryIncidentsApp(){
  const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[session,setSession]=useState<OperatorSession|null>(null)
  const load=async()=>{if(!session)return;try{const r=await operatorFetch('/incidents');if(!r.ok)throw new Error(`Incident API ${r.status}`);setData(await r.json());setError('')}catch(e){setError(e instanceof Error?e.message:'Incident API unavailable')}}
  useEffect(()=>{if(!session)return;load();const t=setInterval(load,15000);return()=>clearInterval(t)},[session?.operator.id])
  const mutate=async(id:string,action:'acknowledge'|'resolve')=>{if(!session){setError('Authenticated operator session is required.');return}const note=window.prompt(action==='resolve'?'Resolution note':'Acknowledgement note')||'';const resolutionCode=action==='resolve'?window.prompt('Resolution code, e.g. CHAIN_VERIFIED')?.trim():undefined;if(action==='resolve'&&!resolutionCode)return;setBusy(id);try{const r=await operatorFetch(`/incidents/${encodeURIComponent(id)}/${action}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({note,resolutionCode})});const body=await r.json();if(!r.ok)throw new Error(body.error||`Incident API ${r.status}`);await load()}catch(e){setError(e instanceof Error?e.message:'Incident update failed')}finally{setBusy('')}}
  const summary=data?.summary
  return <main style={{minHeight:'100vh',background:'#040706',color:'#e8fff0',padding:24,fontFamily:'system-ui'}}>
    <div style={{maxWidth:1180,margin:'0 auto'}}><h1>NEO Treasury Recovery Incidents</h1><p style={{maxWidth:850,color:'#9fc7ad'}}>Fail-closed operator control for ambiguous Bitcoin payout recovery. Open or acknowledged incidents keep the affected payout out of signing and broadcast paths until explicitly resolved.</p>
      <OperatorSessionPanel onSession={setSession}/>
      {error&&<div style={{padding:12,border:'1px solid #734',borderRadius:8,margin:'12px 0'}}>{error}</div>}
      {!session?<p style={{marginTop:20,color:'#9fc7ad'}}>Sign in with a role allowed to view recovery incidents.</p>:<>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,margin:'20px 0'}}>{[['Total',summary?.total],['Open',summary?.open],['Acknowledged',summary?.acknowledged],['Resolved',summary?.resolved],['Blocking',summary?.blocking]].map(([k,v])=><div key={String(k)} style={{border:'1px solid #234b35',borderRadius:10,padding:14}}><small>{k}</small><div style={{fontSize:28,fontWeight:700}}>{v??'—'}</div></div>)}</section>
      <section style={{display:'grid',gap:12}}>{data?.incidents?.map(ctx=><article key={ctx.incident.id} style={{border:'1px solid #234b35',borderRadius:12,padding:16}}><div style={{display:'flex',gap:12,justifyContent:'space-between',flexWrap:'wrap'}}><div><b>{ctx.incident.id}</b> · {ctx.incident.severity} · {ctx.incident.state}<div style={{color:'#9fc7ad'}}>{ctx.incident.reason}</div></div><div>{ctx.blocked?'🔒 PAYOUT HELD':'✓ HOLD RELEASED'}</div></div>
        <div style={{marginTop:12}}>Payout: {ctx.payout?.id||ctx.incident.payoutId} · {ctx.payout?.state||'unknown'} · {ctx.payout?.amountBtc??'—'} BTC · txid {ctx.payout?.txid||'not recorded'} · confirmations {ctx.payout?.confirmations??0}</div>
        <div style={{marginTop:8,color:'#9fc7ad'}}>PSBT records: {ctx.psbts?.length||0} · finalized records: {ctx.finalizedTransactions?.length||0}. Raw PSBT and transaction hex are not exposed here.</div>
        {ctx.incident.resolutionCode&&<div style={{marginTop:8}}>Resolution: {ctx.incident.resolutionCode}</div>}
        <div style={{display:'flex',gap:8,marginTop:14}}>{ctx.incident.state==='OPEN'&&<button disabled={busy===ctx.incident.id} onClick={()=>mutate(ctx.incident.id,'acknowledge')}>Acknowledge</button>}{ctx.incident.state!=='RESOLVED'&&<button disabled={busy===ctx.incident.id} onClick={()=>mutate(ctx.incident.id,'resolve')}>Resolve & Release Hold</button>}</div>
      </article>)}{data&&data.incidents.length===0&&<p>No recovery incidents recorded.</p>}</section></>}
      <p style={{marginTop:24,color:'#9fc7ad'}}>Security note: operator identity now comes from the server session. No long-lived bearer token is compiled into this Pages build.</p>
    </div>
  </main>
}
