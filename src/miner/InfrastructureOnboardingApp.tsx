import {useMemo,useState} from 'react'
import {Bitcoin,Cpu,Globe2,Network,Server,ShieldCheck,WalletCards} from 'lucide-react'

type InfraType='BITCOIN_RPC'|'COUNTERPARTY_API'|'STRATUM_POOL'|'MINER_AGENT'|'FX_PROVIDER'|'PAYMENT_PROVIDER'
const TYPES:{type:InfraType;label:string;icon:any;hint:string}[]=[
  {type:'BITCOIN_RPC',label:'Bitcoin Core',icon:Bitcoin,hint:'Private RPC endpoint; keep authentication server-side.'},
  {type:'COUNTERPARTY_API',label:'Counterparty API',icon:Network,hint:'HTTPS API v2 endpoint.'},
  {type:'STRATUM_POOL',label:'Stratum Pool',icon:Server,hint:'stratum+ssl:// preferred for production.'},
  {type:'MINER_AGENT',label:'Physical Miner Agent',icon:Cpu,hint:'Authenticated HTTPS NEO Miner Agent endpoint.'},
  {type:'FX_PROVIDER',label:'FX Provider',icon:Globe2,hint:'Live World Currency rate source.'},
  {type:'PAYMENT_PROVIDER',label:'Payment Gateway',icon:WalletCards,hint:'Server-side provider with signed webhook verification.'}
]

export function InfrastructureOnboardingApp(){
  const [selected,setSelected]=useState<InfraType>('BITCOIN_RPC')
  const [name,setName]=useState('')
  const [endpoint,setEndpoint]=useState('')
  const item=useMemo(()=>TYPES.find(x=>x.type===selected)!,[selected])
  return <main style={{minHeight:'100vh',background:'#020604',color:'#eaffef',padding:24,fontFamily:'Inter,system-ui,sans-serif'}}><div style={{maxWidth:1180,margin:'0 auto'}}>
    <a href="#/cloud-mining" style={{color:'#79ffa0',textDecoration:'none'}}>← Cloud Mining Operations</a>
    <div style={{marginTop:24}}><div style={{fontSize:12,letterSpacing:2,color:'#79ffa0'}}>PRODUCTION INFRASTRUCTURE</div><h1 style={{fontSize:'clamp(32px,5vw,62px)',margin:'8px 0'}}>Infrastructure Onboarding</h1><p style={{maxWidth:800,color:'#a8bcae'}}>Register production services one at a time. Registration does not make a service live; the backend must independently verify connectivity before a service counts as GREEN.</p></div>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginTop:28}}>{TYPES.map(x=>{const Icon=x.icon;return <button key={x.type} onClick={()=>setSelected(x.type)} style={{textAlign:'left',padding:18,borderRadius:16,border:`1px solid ${selected===x.type?'#4c8c5e':'#24442d'}`,background:selected===x.type?'#0b1c10':'#061109',color:'#eaffef'}}><Icon size={20}/><h3>{x.label}</h3><p style={{color:'#9db6a4',fontSize:13}}>{x.hint}</p></button>})}</section>
    <section style={{marginTop:24,padding:22,border:'1px solid #24442d',borderRadius:18,background:'#061109'}}><div style={{display:'flex',gap:12,alignItems:'center'}}><ShieldCheck/><div><strong>{item.label}</strong><div style={{color:'#9db6a4',fontSize:13}}>{item.type}</div></div></div><div style={{display:'grid',gap:12,marginTop:18}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Connection name" style={field}/><input value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder={selected==='STRATUM_POOL'?'stratum+ssl://pool.example:443':'https://service.example'} style={field}/><button disabled={!name||!endpoint} style={{padding:'13px 16px',borderRadius:10,border:'1px solid #3d6a49',background:'#0c2613',color:'#dfffe7'}}>Register with production backend</button></div><p style={{color:'#9db6a4',fontSize:13,marginBottom:0}}>No private keys, pool passwords, RPC passwords, payment secrets, or API keys are stored in this page. Secrets must be injected into the production backend and referenced there.</p></section>
    <section style={{marginTop:24,padding:22,border:'1px solid #24442d',borderRadius:18,background:'#051008'}}><h2 style={{marginTop:0}}>Verification sequence</h2><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{['REGISTERED','NETWORK PROBE','AUTH VERIFIED','CAPABILITY CHECK','GREEN'].map((x,i)=><span key={x} style={{padding:'9px 12px',border:'1px solid #31513a',borderRadius:999,color:i===4?'#79ffa0':'#b8c8bd'}}>{x}</span>)}</div></section>
  </div></main>
}

const field={padding:'13px 14px',borderRadius:10,border:'1px solid #31513a',background:'#020604',color:'#eaffef',fontSize:15} as const
