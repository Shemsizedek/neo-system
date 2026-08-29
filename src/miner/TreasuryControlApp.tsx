import {useEffect,useState} from 'react'
import {ShieldCheck,Wallet,LockKeyhole,ArrowRightLeft,Activity} from 'lucide-react'
import {OperatorSessionPanel} from './OperatorSessionPanel'
import {operatorFetch,type OperatorSession} from './operatorSession'

type Treasury={policy?:{dailyLimitBtc:number,hotWalletFloorBtc:number,hotWalletTargetBtc:number,coldReserveMinimumBtc:number,requiredConfirmations:number,signingMode:string},hotWalletBalanceBtc:number,coldReserveBalanceBtc:number,dailyBroadcastBtc:number,reserveAction?:{action:string,amountBtc:number},pendingSigningIntents:number}

export function TreasuryControlApp(){
  const[data,setData]=useState<Treasury|null>(null)
  const[error,setError]=useState('')
  const[session,setSession]=useState<OperatorSession|null>(null)
  const load=async()=>{if(!session)return;try{const r=await operatorFetch('/treasury');if(!r.ok)throw new Error(`Treasury API ${r.status}`);setData(await r.json());setError('')}catch(e){setError(e instanceof Error?e.message:'Treasury API unavailable')}}
  useEffect(()=>{if(!session)return;load();const id=setInterval(load,15000);return()=>clearInterval(id)},[session?.operator.id])
  const p=data?.policy
  const cards=[
    {label:'Hot Wallet',value:`${Number(data?.hotWalletBalanceBtc||0).toFixed(8)} BTC`,icon:Wallet},
    {label:'Cold Reserve',value:`${Number(data?.coldReserveBalanceBtc||0).toFixed(8)} BTC`,icon:LockKeyhole},
    {label:'Daily Broadcast',value:`${Number(data?.dailyBroadcastBtc||0).toFixed(8)} / ${Number(p?.dailyLimitBtc||0).toFixed(8)} BTC`,icon:ArrowRightLeft},
    {label:'Pending Signing',value:String(data?.pendingSigningIntents||0),icon:ShieldCheck}
  ]
  return <main style={{minHeight:'100vh',background:'#020604',color:'#eaffef',padding:24,fontFamily:'Inter,system-ui,sans-serif'}}><div style={{maxWidth:1180,margin:'0 auto'}}>
    <a href="#/hashvault" style={{color:'#79ffa0',textDecoration:'none'}}>← HashVault</a>
    <div style={{marginTop:24}}><div style={{fontSize:12,letterSpacing:2,color:'#79ffa0'}}>NEO MINER TREASURY</div><h1 style={{fontSize:'clamp(32px,5vw,64px)',margin:'8px 0'}}>Hot / Cold Wallet Control</h1><p style={{maxWidth:800,color:'#a8bcae'}}>Operational controls for verified BTC payouts. Signing remains server-side/external; private keys are never exposed to GitHub Pages.</p></div>
    <div style={{marginTop:18}}><OperatorSessionPanel onSession={setSession}/></div>
    {error&&<div style={{marginTop:20,padding:16,border:'1px solid #6d4a22',borderRadius:12,background:'#1a1005',color:'#ffd6a0'}}>{error}</div>}
    {!session?<p style={{marginTop:24,color:'#a8bcae'}}>Sign in with an authorized operator account to load treasury state.</p>:<>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginTop:28}}>{cards.map(c=><article key={c.label} style={{padding:20,border:'1px solid #203b27',borderRadius:16,background:'#061109'}}><c.icon size={20}/><div style={{fontSize:12,color:'#9db6a4',marginTop:12}}>{c.label}</div><strong style={{fontSize:22}}>{c.value}</strong></article>)}</section>
    <section style={{marginTop:24,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
      <article style={{padding:22,border:'1px solid #203b27',borderRadius:18,background:'#051008'}}><h2 style={{marginTop:0}}>Policy</h2><p>Hot floor: {p?.hotWalletFloorBtc??0} BTC</p><p>Hot target: {p?.hotWalletTargetBtc??0} BTC</p><p>Cold minimum: {p?.coldReserveMinimumBtc??0} BTC</p><p>Confirmations: {p?.requiredConfirmations??0}</p><p>Signing mode: {p?.signingMode||'BLOCKED'}</p></article>
      <article style={{padding:22,border:'1px solid #203b27',borderRadius:18,background:'#051008'}}><h2 style={{marginTop:0}}>Reserve action</h2><Activity size={22}/><p style={{fontSize:18}}>{data?.reserveAction?.action||'UNKNOWN'}</p><p style={{color:'#a8bcae'}}>{Number(data?.reserveAction?.amountBtc||0).toFixed(8)} BTC</p><button onClick={load} style={{padding:'11px 16px',borderRadius:10,border:'1px solid #3d6a49',background:'#0c2613',color:'#dfffe7'}}>Refresh</button></article>
    </section></>}
  </div></main>
}
