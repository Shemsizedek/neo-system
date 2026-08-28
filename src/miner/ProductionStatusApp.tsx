import {useEffect,useState} from 'react'
import {Activity,Bitcoin,Cpu,Globe2,Server,ShieldCheck,WalletCards} from 'lucide-react'

type Gate={id:string,label:string,ok:boolean,detail:string}
type Readiness={ready:boolean,mode:string,gates?:Gate[],reason?:string}

const API=(import.meta.env.VITE_NEO_MINER_PRODUCTION_API||'').replace(/\/$/,'')

export function ProductionStatusApp(){
  const[data,setData]=useState<Readiness|null>(null)
  const[error,setError]=useState('')
  const load=async()=>{
    if(!API){setError('Production API URL is not configured. Set VITE_NEO_MINER_PRODUCTION_API at build time.');return}
    try{const r=await fetch(`${API}/ready`,{cache:'no-store'});const j=await r.json();setData(j);setError('')}catch(e){setError(e instanceof Error?e.message:'Production API unavailable')}
  }
  useEffect(()=>{load();const id=setInterval(load,15000);return()=>clearInterval(id)},[])
  const gates=data?.gates||[]
  return <main style={{minHeight:'100vh',background:'#020604',color:'#eaffef',padding:24,fontFamily:'Inter,system-ui,sans-serif'}}>
    <div style={{maxWidth:1180,margin:'0 auto'}}>
      <a href="#/generator" style={{color:'#79ffa0',textDecoration:'none'}}>← NEO Bitcoin Generator</a>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:20,marginTop:24,flexWrap:'wrap'}}>
        <div><div style={{fontSize:12,letterSpacing:2,color:'#79ffa0'}}>NEO CLOUD MINING</div><h1 style={{fontSize:'clamp(32px,5vw,64px)',margin:'8px 0'}}>Production Connection Gate</h1><p style={{maxWidth:760,color:'#a8bcae'}}>Live status for Bitcoin, Counterparty, Stratum mining, verified ASIC agents, FX, World Currency payments, persistence, and compliance. The system remains fail-closed until every required gate is green.</p></div>
        <div style={{border:'1px solid #24442d',borderRadius:18,padding:'18px 22px',minWidth:220,background:'#061109'}}><div style={{fontSize:12,color:'#9db6a4'}}>SYSTEM MODE</div><strong style={{fontSize:28,color:data?.ready?'#7cff9d':'#ffd36b'}}>{data?.mode||'BLOCKED'}</strong></div>
      </div>
      {error&&<div style={{marginTop:20,padding:16,border:'1px solid #6d4a22',borderRadius:12,background:'#1a1005',color:'#ffd6a0'}}>{error}</div>}
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,marginTop:28}}>
        {gates.map((g,i)=><GateCard key={g.id||g.label} gate={g} icon={[Bitcoin,Server,Activity,Cpu,Globe2,WalletCards,ShieldCheck][i%7]}/>) }
        {!gates.length&&!error&&<div style={{padding:24,border:'1px solid #203b27',borderRadius:16}}>Loading production readiness…</div>}
      </section>
      <section style={{marginTop:28,padding:22,border:'1px solid #203b27',borderRadius:18,background:'#051008'}}><h2 style={{marginTop:0}}>Activation rule</h2><p style={{color:'#a8bcae'}}>A paid NEO Cloud Mining contract can activate only after live payment confirmation, backed hashrate allocation, verified miner connectivity, non-simulation share accounting, a valid settlement destination, and a fully green production gate.</p><button onClick={load} style={{marginTop:8,padding:'12px 18px',borderRadius:10,border:'1px solid #3d6a49',background:'#0c2613',color:'#dfffe7',cursor:'pointer'}}>Refresh status</button></section>
    </div>
  </main>
}

function GateCard({gate,icon:Icon}:{gate:Gate,icon:typeof Activity}){return <article style={{padding:20,border:`1px solid ${gate.ok?'#2f6840':'#5c4722'}`,borderRadius:16,background:gate.ok?'#06140a':'#151006'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><Icon size={20}/><strong style={{color:gate.ok?'#7cff9d':'#ffd36b'}}>{gate.ok?'GREEN':'BLOCKED'}</strong></div><h3>{gate.label}</h3><p style={{color:'#a8bcae',fontSize:14}}>{gate.detail}</p></article>}
