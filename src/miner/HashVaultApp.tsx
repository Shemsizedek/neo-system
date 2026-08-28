import {useEffect,useState} from 'react'
import {Bitcoin,Database,Receipt,ShieldCheck,WalletCards} from 'lucide-react'

type Snapshot={summary?:{postedCredits:number,grossBtc:number,feesBtc:number,netBtc:number,customers?:Array<{customerId:string,grossBtc:number,feesBtc:number,netBtc:number,credits:number}>},verifiedShares?:number,reconciledPayouts?:number,entries?:Array<any>}
const API=(import.meta.env.VITE_NEO_MINER_PRODUCTION_API||'').replace(/\/$/,'')
const TOKEN=import.meta.env.VITE_NEO_MINER_OPERATOR_TOKEN||''
const btc=(v:number|undefined)=>`${Number(v||0).toFixed(8)} BTC`

export function HashVaultApp(){
  const[data,setData]=useState<Snapshot|null>(null);const[error,setError]=useState('')
  const load=async()=>{if(!API){setError('Production API URL is not configured.');return}try{const r=await fetch(`${API}/hashvault`,{cache:'no-store',headers:TOKEN?{authorization:`Bearer ${TOKEN}`}:{}});if(!r.ok)throw new Error(`HashVault API ${r.status}`);setData(await r.json());setError('')}catch(e){setError(e instanceof Error?e.message:'HashVault unavailable')}}
  useEffect(()=>{load();const id=setInterval(load,15000);return()=>clearInterval(id)},[])
  const s=data?.summary
  return <main style={{minHeight:'100vh',background:'#020604',color:'#eaffef',padding:24,fontFamily:'Inter,system-ui,sans-serif'}}><div style={{maxWidth:1180,margin:'0 auto'}}>
    <a href="#/cloud-mining" style={{color:'#79ffa0',textDecoration:'none'}}>← NEO Cloud Mining Operations</a>
    <div style={{marginTop:24}}><div style={{fontSize:12,letterSpacing:2,color:'#79ffa0'}}>NEO HASHVAULT</div><h1 style={{fontSize:'clamp(32px,5vw,64px)',margin:'8px 0'}}>Verified BTC Attribution Ledger</h1><p style={{maxWidth:800,color:'#a8bcae'}}>Only confirmed pool payouts reconciled against verified, contract-linked Stratum shares may become customer BTC credits. Estimated or simulated output never enters this ledger.</p></div>
    {error&&<div style={{marginTop:18,padding:16,border:'1px solid #6d4a22',borderRadius:12,background:'#1a1005',color:'#ffd6a0'}}>{error}</div>}
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:14,marginTop:28}}>
      <Card icon={ShieldCheck} label="Verified shares" value={String(data?.verifiedShares||0)}/><Card icon={Database} label="Reconciled payouts" value={String(data?.reconciledPayouts||0)}/><Card icon={Receipt} label="Posted credits" value={String(s?.postedCredits||0)}/><Card icon={Bitcoin} label="Gross attributed" value={btc(s?.grossBtc)}/><Card icon={WalletCards} label="Net customer BTC" value={btc(s?.netBtc)}/>
    </section>
    <section style={{marginTop:28,padding:20,border:'1px solid #203b27',borderRadius:18,background:'#051008'}}><h2 style={{marginTop:0}}>Customer balances</h2>{(s?.customers||[]).length===0?<p style={{color:'#a8bcae'}}>No verified customer credits have posted yet.</p>:(s?.customers||[]).map(c=><div key={c.customerId} style={{display:'grid',gridTemplateColumns:'1.2fr repeat(4,1fr)',gap:12,padding:'14px 0',borderTop:'1px solid #17301d'}}><b>{c.customerId}</b><span>{btc(c.grossBtc)} gross</span><span>{btc(c.feesBtc)} fees</span><span>{btc(c.netBtc)} net</span><span>{c.credits} credits</span></div>)}</section>
    <section style={{marginTop:20,padding:20,border:'1px solid #203b27',borderRadius:18,background:'#051008'}}><h2 style={{marginTop:0}}>Accounting rule</h2><p style={{color:'#a8bcae'}}>Miner identity → accepted Stratum share → contract allocation → confirmed pool payout → reconciled attribution → fee calculation → HashVault credit. Any broken link blocks posting.</p><button onClick={load} style={{padding:'12px 18px',borderRadius:10,border:'1px solid #3d6a49',background:'#0c2613',color:'#dfffe7'}}>Refresh ledger</button></section>
  </div></main>
}
function Card({icon:Icon,label,value}:{icon:typeof Bitcoin,label:string,value:string}){return <article style={{padding:20,border:'1px solid #203b27',borderRadius:16,background:'#061109'}}><Icon size={20}/><div style={{fontSize:12,color:'#9db6a4',marginTop:14}}>{label}</div><strong style={{display:'block',fontSize:24,marginTop:5}}>{value}</strong></article>}
