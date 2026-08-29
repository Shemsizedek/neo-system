/// <reference types="vite/client" />
import React,{useEffect,useState} from 'react'

type Health={service?:string,status?:string,mode?:string,storage?:{engine?:string,persistent?:boolean},time?:string}

export function PersistenceAuditApp(){
  const api=(import.meta.env.VITE_NEO_MINER_PRODUCTION_API||'').replace(/\/$/,'')
  const[health,setHealth]=useState<Health|null>(null)
  const[error,setError]=useState('')
  useEffect(()=>{if(!api)return;let active=true;const load=async()=>{try{const r=await fetch(`${api}/health`,{cache:'no-store'});const data=await r.json();if(active){setHealth(data);setError('')}}catch(e){if(active)setError(e instanceof Error?e.message:'Backend unavailable')}};load();const timer=setInterval(load,15000);return()=>{active=false;clearInterval(timer)}},[api])
  const cards=[
    ['Database',health?.storage?.persistent?`${health.storage.engine||'SQLITE'} · DURABLE`:'NOT VERIFIED'],
    ['Restart recovery','Contracts · HashVault · payouts · receipts · PSBTs'],
    ['Journal','Append-only authenticated audit events'],
    ['Idempotency','Required for payout create · pool reconciliation · HashVault credit'],
    ['SQLite safety','WAL + synchronous FULL'],
    ['Secrets','No keys, RPC auth, or signer material stored in Pages']
  ]
  return <main style={{minHeight:'100vh',background:'#020604',color:'#dfffea',fontFamily:'Inter,system-ui,sans-serif',padding:'28px'}}>
    <div style={{maxWidth:1180,margin:'0 auto'}}>
      <div style={{fontSize:12,letterSpacing:2,color:'#74ff9d'}}>NEO MINER · PRODUCTION CONTROL</div>
      <h1 style={{fontSize:36,margin:'8px 0'}}>Persistent Treasury & HashVault Audit</h1>
      <p style={{maxWidth:850,color:'#9fc8aa',lineHeight:1.6}}>Financial state is designed to survive process restarts. The public console exposes only storage health; the detailed audit journal remains on the authenticated production API.</p>
      {!api&&<div style={{padding:14,border:'1px solid #725d19',borderRadius:12,background:'#171305',margin:'18px 0'}}>Build-time <code>VITE_NEO_MINER_PRODUCTION_API</code> is not configured, so live storage health cannot be verified from this page.</div>}
      {error&&<div style={{padding:14,border:'1px solid #7a2929',borderRadius:12,background:'#190707',margin:'18px 0'}}>{error}</div>}
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,marginTop:24}}>
        {cards.map(([label,value])=><article key={label} style={{border:'1px solid #174628',borderRadius:16,padding:18,background:'#06100a'}}><div style={{fontSize:12,color:'#6fb984',textTransform:'uppercase',letterSpacing:1}}>{label}</div><div style={{fontSize:18,fontWeight:700,marginTop:10}}>{value}</div></article>)}
      </section>
      <section style={{marginTop:26,border:'1px solid #174628',borderRadius:16,padding:20,background:'#050d08'}}>
        <h2 style={{marginTop:0}}>Durable financial chain</h2>
        <div style={{fontFamily:'ui-monospace,SFMono-Regular,monospace',lineHeight:2,color:'#aaffbe'}}>VERIFIED SHARE → POOL RECONCILIATION → HASHVAULT CREDIT → PAYOUT → PSBT → EXTERNAL SIGNER → BITCOIN CORE → RECEIPT → AUDIT JOURNAL</div>
        <p style={{color:'#9fc8aa'}}>Production must mount the directory containing <code>NEO_MINER_DB_PATH</code> on persistent storage. A container-local ephemeral filesystem does not satisfy this gate.</p>
      </section>
    </div>
  </main>
}
