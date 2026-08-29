import {useEffect,useState} from 'react'
import {Activity,ArrowLeft,CheckCircle2,Cpu,Radio,RefreshCw,ShieldCheck,Thermometer,Zap} from 'lucide-react'
import {OperatorSessionPanel} from './OperatorSessionPanel'
import {operatorFetch,type OperatorSession} from './operatorSession'

type Miner={id:string,model:string,state:string,trust:string,siteId?:string,telemetry?:{hashrateTh:number,powerW:number,temperatureC:number,fanRpm:number,poolConnected:boolean,reportedAt:string},shareStats?:{accepted:number,rejected:number,verified:number}}
type FleetResponse={summary?:{enrolled:number,online:number,verifiedIdentities:number,totalHashrateTh:number,acceptedShares:number,verifiedShares:number},miners?:Miner[]}

export function FleetEnrollmentApp(){
  const[data,setData]=useState<FleetResponse>({})
  const[error,setError]=useState('')
  const[session,setSession]=useState<OperatorSession|null>(null)
  const load=async()=>{
    if(!session)return
    try{const r=await operatorFetch('/fleet',{cache:'no-store'});if(!r.ok)throw new Error(`Fleet API ${r.status}`);setData(await r.json());setError('')}catch(e){setError(e instanceof Error?e.message:'Fleet API unavailable')}
  }
  useEffect(()=>{if(!session)return;load();const id=setInterval(load,15000);return()=>clearInterval(id)},[session?.operator.id])
  const s=data.summary||{enrolled:0,online:0,verifiedIdentities:0,totalHashrateTh:0,acceptedShares:0,verifiedShares:0}
  return <main style={{minHeight:'100vh',background:'#020604',color:'#eaffef',padding:24,fontFamily:'Inter,system-ui,sans-serif'}}>
    <div style={{maxWidth:1200,margin:'0 auto'}}>
      <a href="#/cloud-mining" style={{display:'inline-flex',gap:8,alignItems:'center',color:'#79ffa0',textDecoration:'none'}}><ArrowLeft size={16}/> Cloud Mining Operations</a>
      <div style={{marginTop:22,display:'flex',justifyContent:'space-between',gap:20,alignItems:'end',flexWrap:'wrap'}}><div><div style={{fontSize:12,letterSpacing:2,color:'#79ffa0'}}>NEO MINER FLEET</div><h1 style={{fontSize:'clamp(34px,5vw,62px)',margin:'8px 0'}}>Enrollment & Verified Work</h1><p style={{maxWidth:780,color:'#a8bcae'}}>Only miners with verified cryptographic identity, live telemetry, and pool-accepted non-simulation shares can contribute to cloud-mining accounting.</p></div>{session&&<button onClick={load} style={{display:'inline-flex',gap:8,alignItems:'center',padding:'12px 16px',borderRadius:12,border:'1px solid #355c3f',background:'#0a1d0f',color:'#eaffef'}}><RefreshCw size={16}/> Refresh</button>}</div>
      <div style={{marginTop:18}}><OperatorSessionPanel onSession={setSession}/></div>
      {error&&<div style={{marginTop:20,padding:15,border:'1px solid #6d4a22',borderRadius:12,background:'#1a1005',color:'#ffd6a0'}}>{error}</div>}
      {!session?<p style={{marginTop:24,color:'#a8bcae'}}>Sign in with an authorized operations account to load fleet state.</p>:<>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginTop:26}}><Kpi icon={Cpu} label="Enrolled" value={String(s.enrolled)}/><Kpi icon={ShieldCheck} label="Verified IDs" value={String(s.verifiedIdentities)}/><Kpi icon={Activity} label="Online" value={String(s.online)}/><Kpi icon={Zap} label="Live Hashrate" value={`${Number(s.totalHashrateTh||0).toFixed(1)} TH/s`}/><Kpi icon={CheckCircle2} label="Accepted Shares" value={String(s.acceptedShares)}/><Kpi icon={Radio} label="Verified Shares" value={String(s.verifiedShares)}/></section>
      <section style={{marginTop:26,display:'grid',gap:14}}>{(data.miners||[]).map(m=><article key={m.id} style={{border:'1px solid #203b27',borderRadius:18,padding:20,background:'#051008'}}><div style={{display:'flex',justifyContent:'space-between',gap:18,flexWrap:'wrap'}}><div><div style={{fontSize:12,color:'#79ffa0',letterSpacing:1.5}}>{m.id}</div><h3 style={{margin:'6px 0'}}>{m.model||'NEO Miner'}</h3><div style={{color:'#9db6a4'}}>{m.siteId||'Unassigned site'} • {m.state}</div></div><div style={{textAlign:'right'}}><strong style={{color:m.trust==='VERIFIED_IDENTITY'?'#7cff9d':'#ffd36b'}}>{m.trust}</strong><div style={{fontSize:13,color:'#9db6a4',marginTop:6}}>{m.telemetry?.poolConnected?'POOL CONNECTED':'POOL OFFLINE'}</div></div></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginTop:18}}><Metric icon={Zap} label="Hashrate" value={`${Number(m.telemetry?.hashrateTh||0).toFixed(1)} TH/s`}/><Metric icon={Activity} label="Power" value={`${Number(m.telemetry?.powerW||0).toFixed(0)} W`}/><Metric icon={Thermometer} label="Temperature" value={`${Number(m.telemetry?.temperatureC||0).toFixed(1)} °C`}/><Metric icon={Radio} label="Verified shares" value={String(m.shareStats?.verified||0)}/></div></article>)}{!(data.miners||[]).length&&!error&&<div style={{padding:24,border:'1px solid #203b27',borderRadius:16,color:'#a8bcae'}}>No miners enrolled yet.</div>}</section>
      <section style={{marginTop:26,padding:20,border:'1px solid #203b27',borderRadius:18,background:'#051008'}}><h2 style={{marginTop:0}}>Accounting boundary</h2><p style={{color:'#a8bcae'}}>A share is customer-accounting eligible only after miner identity verification, live miner state, matching miner/share identity, non-simulation status, and an accepted pool receipt for the same share ID. Failed or simulated shares remain excluded.</p></section></>}
    </div>
  </main>
}
function Kpi({icon:Icon,label,value}:{icon:typeof Cpu,label:string,value:string}){return <div style={{padding:16,border:'1px solid #203b27',borderRadius:14,background:'#051008'}}><Icon size={18}/><div style={{fontSize:12,color:'#9db6a4',marginTop:10}}>{label}</div><strong style={{fontSize:24}}>{value}</strong></div>}
function Metric({icon:Icon,label,value}:{icon:typeof Cpu,label:string,value:string}){return <div style={{padding:12,border:'1px solid #19301f',borderRadius:12}}><div style={{display:'flex',gap:7,alignItems:'center',color:'#9db6a4',fontSize:12}}><Icon size={14}/>{label}</div><strong style={{display:'block',marginTop:6}}>{value}</strong></div>}
