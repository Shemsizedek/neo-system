import React,{useEffect,useState} from 'react'
import {OperatorSessionPanel} from './OperatorSessionPanel'
import {operatorFetch,type OperatorSession} from './operatorSession'

type Treasury={
  policy?:{signingMode?:string,requiredConfirmations?:number}
  psbt?:{walletRpcConfigured?:boolean,prepared?:number,finalized?:number,signingMode?:string}
  hotWalletBalanceBtc?:number
  coldReserveBalanceBtc?:number
  dailyBroadcastBtc?:number
}

export function BitcoinPayoutAdapterApp(){
  const[data,setData]=useState<Treasury|null>(null)
  const[message,setMessage]=useState('Sign in to load protected treasury state.')
  const[session,setSession]=useState<OperatorSession|null>(null)
  const load=async()=>{if(!session)return;try{const r=await operatorFetch('/treasury',{cache:'no-store'});if(!r.ok)throw new Error(`Treasury API ${r.status}`);setData(await r.json());setMessage('Authenticated treasury session active.')}catch(e){setMessage(e instanceof Error?e.message:'Treasury API unavailable')}}
  useEffect(()=>{if(session)load()},[session?.operator.id])
  const steps=['Verified HashVault balance','Treasury approval tier','Bitcoin Core funded PSBT','External/HSM signer','Bitcoin Core finalizepsbt','Bitcoin Core sendrawtransaction','Mempool + confirmation sync','Immutable settlement receipt']
  return <main style={{minHeight:'100vh',background:'#030806',color:'#e8fff0',padding:'32px',fontFamily:'system-ui,sans-serif'}}>
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <div style={{fontSize:13,letterSpacing:2,opacity:.7}}>NEO MINER · TREASURY</div>
      <h1 style={{fontSize:38,margin:'8px 0'}}>Bitcoin Core PSBT / External Signer</h1>
      <p style={{maxWidth:780,lineHeight:1.6,color:'#b8d8c1'}}>Production payout signing stays outside the application server. The server may fund and finalize PSBTs through Bitcoin Core, but private keys remain in the configured external signer or HSM boundary.</p>
      <OperatorSessionPanel onSession={setSession}/>
      <div style={{padding:16,border:'1px solid #274a33',borderRadius:12,margin:'24px 0',background:'#07120c'}}>{message}</div>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:14}}>
        <Card title="Wallet RPC" value={data?.psbt?.walletRpcConfigured?'CONFIGURED':'PROTECTED / UNKNOWN'} />
        <Card title="Signing Mode" value={data?.psbt?.signingMode||'EXTERNAL_SIGNER'} />
        <Card title="Prepared PSBTs" value={String(data?.psbt?.prepared??0)} />
        <Card title="Finalized PSBTs" value={String(data?.psbt?.finalized??0)} />
      </section>
      <section style={{marginTop:28,padding:22,border:'1px solid #1f3a29',borderRadius:14}}>
        <h2 style={{marginTop:0}}>Fail-closed payout sequence</h2>
        {steps.map((s,i)=><div key={s} style={{display:'flex',gap:14,padding:'10px 0',borderBottom:i===steps.length-1?'none':'1px solid #13251a'}}><strong style={{width:26}}>{i+1}</strong><span>{s}</span></div>)}
      </section>
      <p style={{marginTop:22,color:'#91ad98',fontSize:14}}>No private key, seed phrase, HSM secret, RPC password, bearer token, or signer credential is rendered by this page or committed to the repository.</p>
      <nav style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:28}}><a href="./miner-treasury/" style={linkStyle}>Treasury Control</a><a href="./settlement-receipts/" style={linkStyle}>Settlement Receipts</a><a href="./hashvault/" style={linkStyle}>HashVault</a></nav>
    </div>
  </main>
}

function Card({title,value}:{title:string,value:string}){return <div style={{padding:18,border:'1px solid #21452d',borderRadius:12,background:'#061008'}}><div style={{fontSize:12,opacity:.65,letterSpacing:1}}>{title}</div><div style={{fontSize:21,fontWeight:700,marginTop:8}}>{value}</div></div>}
const linkStyle:React.CSSProperties={color:'#d8ffe2',textDecoration:'none',border:'1px solid #315c3d',padding:'10px 14px',borderRadius:9}
