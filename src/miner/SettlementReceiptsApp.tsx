import {useState} from 'react'
import {Bitcoin,FileCheck2,Search,ShieldCheck} from 'lucide-react'

const API=(import.meta.env.VITE_NEO_MINER_PRODUCTION_API||'').replace(/\/$/,'')

type Receipt={receiptId:string,amountBtc:number,txid:string,confirmations:number,contractIds:string[],settledAt:string,integrityHash:string,status:string}

export function SettlementReceiptsApp(){
  const[id,setId]=useState('')
  const[data,setData]=useState<Receipt|null>(null)
  const[error,setError]=useState('')
  const lookup=async()=>{
    setData(null);setError('')
    if(!API){setError('Production receipt API is not configured for this build.');return}
    if(!id.trim()){setError('Enter a settlement receipt ID.');return}
    try{const r=await fetch(`${API}/receipts/${encodeURIComponent(id.trim())}`,{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Receipt lookup failed');setData(j)}catch(e){setError(e instanceof Error?e.message:'Receipt lookup failed')}
  }
  return <main style={{minHeight:'100vh',background:'#020604',color:'#eaffef',padding:24,fontFamily:'Inter,system-ui,sans-serif'}}>
    <div style={{maxWidth:980,margin:'0 auto'}}>
      <a href="?route=hashvault" style={{color:'#79ffa0',textDecoration:'none'}}>← HashVault</a>
      <div style={{marginTop:24}}><div style={{fontSize:12,letterSpacing:2,color:'#79ffa0'}}>NEO EXPLORER / NEOSCAN</div><h1 style={{fontSize:'clamp(34px,6vw,68px)',margin:'8px 0'}}>Settlement Receipts</h1><p style={{maxWidth:760,color:'#a8bcae'}}>Public verification of finalized Bitcoin payouts from verified HashVault balances. Only confirmed, non-simulation mining output can produce a receipt.</p></div>
      <section style={{marginTop:28,padding:22,border:'1px solid #203b27',borderRadius:18,background:'#051008'}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><input value={id} onChange={e=>setId(e.target.value)} placeholder="RCP-..." style={{flex:1,minWidth:240,padding:13,borderRadius:10,border:'1px solid #315039',background:'#020604',color:'#eaffef'}}/><button onClick={lookup} style={{padding:'12px 18px',borderRadius:10,border:'1px solid #3d6a49',background:'#0c2613',color:'#eaffef'}}><Search size={16}/> Verify</button></div>
        {error&&<p style={{color:'#ffd36b'}}>{error}</p>}
      </section>
      {data&&<section style={{marginTop:24,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
        <Card icon={FileCheck2} label="Receipt" value={data.receiptId}/><Card icon={Bitcoin} label="Amount" value={`${data.amountBtc.toFixed(8)} BTC`}/><Card icon={ShieldCheck} label="Status" value={`${data.status} • ${data.confirmations} conf`}/>
        <article style={{gridColumn:'1/-1',padding:20,border:'1px solid #203b27',borderRadius:16,background:'#051008'}}><p style={{color:'#9db6a4'}}>Bitcoin transaction</p><code style={{wordBreak:'break-all'}}>{data.txid}</code><p style={{color:'#9db6a4'}}>Integrity hash</p><code style={{wordBreak:'break-all'}}>{data.integrityHash}</code><p style={{color:'#9db6a4'}}>Contracts</p><div>{data.contractIds.join(', ')||'—'}</div><p style={{color:'#9db6a4'}}>Settled</p><div>{data.settledAt||'—'}</div></article>
      </section>}
    </div>
  </main>
}
function Card({icon:Icon,label,value}:{icon:typeof Bitcoin,label:string,value:string}){return <article style={{padding:20,border:'1px solid #203b27',borderRadius:16,background:'#051008'}}><Icon size={20}/><p style={{color:'#9db6a4'}}>{label}</p><strong style={{fontSize:20,wordBreak:'break-word'}}>{value}</strong></article>}
