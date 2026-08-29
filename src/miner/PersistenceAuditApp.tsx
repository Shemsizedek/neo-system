/// <reference types="vite/client" />
import React,{useEffect,useState} from 'react'
import {OperatorSessionPanel} from './OperatorSessionPanel'
import {operatorFetch,type OperatorSession} from './operatorSession'

type AuditPayload={events?:Array<{seq?:number;eventId?:string;kind?:string;entityId?:string;action?:string;createdAt?:string}>}
type Treasury={storage?:{engine?:string;persistent?:boolean;payouts?:number;receipts?:number;hashVaultEntries?:number}}

export function PersistenceAuditApp(){
  const[session,setSession]=useState<OperatorSession|null>(null),[audit,setAudit]=useState<AuditPayload|null>(null),[treasury,setTreasury]=useState<Treasury|null>(null),[error,setError]=useState('')
  const load=async()=>{if(!session)return;try{const [a,t]=await Promise.all([operatorFetch('/audit',{cache:'no-store'}),operatorFetch('/treasury',{cache:'no-store'})]);if(!a.ok)throw new Error(`Audit API ${a.status}`);if(!t.ok)throw new Error(`Treasury API ${t.status}`);setAudit(await a.json());setTreasury(await t.json());setError('')}catch(e){setError(e instanceof Error?e.message:'Audit backend unavailable')}}
  useEffect(()=>{if(!session)return;load();const timer=setInterval(load,15000);return()=>clearInterval(timer)},[session?.operator.id])
  const storage=treasury?.storage
  const cards=[
    ['Database',storage?.persistent?`${storage.engine||'SQLITE'} · DURABLE`:'NOT VERIFIED'],
    ['Restart recovery','Contracts · HashVault · payouts · receipts · PSBTs'],
    ['Journal',`${audit?.events?.length??0} recent authenticated audit events`],
    ['Idempotency','Required for payout create · pool reconciliation · HashVault credit'],
    ['SQLite safety','WAL + synchronous FULL'],
    ['Secrets','No keys, RPC auth, or signer material stored in Pages']
  ]
  return <main style={{minHeight:'100vh',background:'#020604',color:'#dfffea',fontFamily:'Inter,system-ui,sans-serif',padding:'28px'}}>
    <div style={{maxWidth:1180,margin:'0 auto'}}>
      <div style={{fontSize:12,letterSpacing:2,color:'#74ff9d'}}>NEO MINER · PRODUCTION CONTROL</div>
      <h1 style={{fontSize:36,margin:'8px 0'}}>Persistent Treasury & HashVault Audit</h1>
      <p style={{maxWidth:850,color:'#9fc8aa',lineHeight:1.6}}>Financial state is designed to survive process restarts. Detailed audit data now requires a short-lived operator session and never a bearer token embedded in the Pages bundle.</p>
      <OperatorSessionPanel onSession={setSession}/>
      {error&&<div style={{padding:14,border:'1px solid #7a2929',borderRadius:12,background:'#190707',margin:'18px 0'}}>{error}</div>}
      {!session?<p style={{marginTop:20,color:'#9fc8aa'}}>Sign in with an operations, treasury, or admin role to inspect storage and audit state.</p>:<>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,marginTop:24}}>
        {cards.map(([label,value])=><article key={label} style={{border:'1px solid #174628',borderRadius:16,padding:18,background:'#06100a'}}><div style={{fontSize:12,color:'#6fb984',textTransform:'uppercase',letterSpacing:1}}>{label}</div><div style={{fontSize:18,fontWeight:700,marginTop:10}}>{value}</div></article>)}
      </section>
      <section style={{marginTop:26,border:'1px solid #174628',borderRadius:16,padding:20,background:'#050d08'}}>
        <h2 style={{marginTop:0}}>Durable financial chain</h2>
        <div style={{fontFamily:'ui-monospace,SFMono-Regular,monospace',lineHeight:2,color:'#aaffbe'}}>VERIFIED SHARE → POOL RECONCILIATION → HASHVAULT CREDIT → PAYOUT → PSBT → EXTERNAL SIGNER → BITCOIN CORE → RECEIPT → AUDIT JOURNAL</div>
        <p style={{color:'#9fc8aa'}}>Production must mount the directory containing <code>NEO_MINER_DB_PATH</code> on persistent storage. A container-local ephemeral filesystem does not satisfy this gate.</p>
        <button onClick={load}>Refresh audit</button>
      </section></>}
    </div>
  </main>
}
