import {useEffect,useMemo,useState} from 'react'
import {Activity,Bitcoin,Cpu,Database,Globe2,Server,ShieldCheck,WalletCards,Zap} from 'lucide-react'

type Ready={ready:boolean,mode:string,missing?:string[],liveProbe?:Record<string,unknown>|null}
type ContractSummary={total:number,active:number,settlementPending:number,settled:number}

const API=(import.meta.env.VITE_NEO_MINER_PRODUCTION_API||'').replace(/\/$/,'')

export function CloudMiningOperationsApp(){
  const[ready,setReady]=useState<Ready|null>(null)
  const[error,setError]=useState('')
  const[contracts,setContracts]=useState<ContractSummary>({total:0,active:0,settlementPending:0,settled:0})
  const load=async()=>{
    if(!API){setError('Production API is not connected yet. Configure VITE_NEO_MINER_PRODUCTION_API in the GitHub Pages build environment.');return}
    try{
      const r=await fetch(`${API}/ready`,{cache:'no-store'})
      const j=await r.json()
      setReady(j)
      setError('')
    }catch(e){setError(e instanceof Error?e.message:'Production API unavailable')}
  }
  useEffect(()=>{load();const id=setInterval(load,15000);return()=>clearInterval(id)},[])
  const missing=ready?.missing||[]
  const live=ready?.ready===true
  const cards=useMemo(()=>[
    ['Bitcoin Network',live&&!missing.includes('bitcoin_rpc'),Bitcoin],
    ['Counterparty API',live&&!missing.includes('counterparty_api'),Server],
    ['Mining Pool',live&&!missing.includes('mining_pool'),Activity],
    ['ASIC Fleet',live&&!missing.includes('miner_agents'),Cpu],
    ['World Currency FX',live&&!missing.includes('fx_rates'),Globe2],
    ['Payment Gateway',live&&!missing.includes('payment_gateway'),WalletCards],
    ['Contract Storage',live&&!missing.includes('contract_store'),Database],
    ['Compliance Gate',live&&!missing.includes('compliance_gate'),ShieldCheck]
  ] as const,[live,missing])

  return <main style={{minHeight:'100vh',background:'#020604',color:'#eaffef',padding:24,fontFamily:'Inter,system-ui,sans-serif'}}>
    <div style={{maxWidth:1240,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
        <div><a href="?route=generator-production" style={{color:'#79ffa0',textDecoration:'none'}}>← Production Gate</a><div style={{fontSize:12,letterSpacing:2,color:'#79ffa0',marginTop:18}}>NEO CLOUD MINING</div><h1 style={{fontSize:'clamp(34px,6vw,68px)',margin:'8px 0 10px'}}>Operations Center</h1><p style={{maxWidth:820,color:'#a8bcae',fontSize:17,lineHeight:1.6}}>Production control surface for backed SHA-256 cloud-mining contracts, physical miner allocation, verified pool work, World Currency payments, and BTC settlement. Live actions remain fail-closed until every production dependency is verified.</p></div>
        <div style={{alignSelf:'flex-start',border:'1px solid #294c34',borderRadius:18,padding:'18px 22px',background:'#061109',minWidth:220}}><div style={{fontSize:12,color:'#9db6a4'}}>OPERATING MODE</div><strong style={{fontSize:30,color:live?'#7cff9d':'#ffd36b'}}>{ready?.mode||'BLOCKED'}</strong><div style={{fontSize:12,color:'#8fa498',marginTop:6}}>{live?'All production gates green':'Fail-closed by design'}</div></div>
      </div>

      {error&&<div style={{marginTop:22,padding:18,border:'1px solid #6d4a22',borderRadius:14,background:'#1a1005',color:'#ffd6a0'}}>{error}</div>}

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginTop:28}}>
        {cards.map(([label,ok,Icon])=><article key={label} style={{padding:18,border:`1px solid ${ok?'#2f6840':'#51431f'}`,borderRadius:16,background:ok?'#06140a':'#141005'}}><div style={{display:'flex',justifyContent:'space-between'}}><Icon size={20}/><strong style={{color:ok?'#7cff9d':'#ffd36b'}}>{ok?'GREEN':'BLOCKED'}</strong></div><h3 style={{marginBottom:4}}>{label}</h3><small style={{color:'#94a99a'}}>{ok?'Verified production dependency':'Connection or verification required'}</small></article>)}
      </section>

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginTop:22}}>
        <Metric label="Contracts" value={contracts.total} sub="all cloud-mining agreements"/>
        <Metric label="Active" value={contracts.active} sub="backed and mining"/>
        <Metric label="Settlement Pending" value={contracts.settlementPending} sub="awaiting verified BTC credit"/>
        <Metric label="Settled" value={contracts.settled} sub="completed settlement records"/>
      </section>

      <section style={{marginTop:24,padding:22,border:'1px solid #203b27',borderRadius:18,background:'#051008'}}><div style={{display:'flex',alignItems:'center',gap:10}}><Zap size={20}/><h2 style={{margin:0}}>Production sequence</h2></div><p style={{color:'#a8bcae',lineHeight:1.6}}>World Currency payment → contract execution → backed hashrate reservation → verified ASIC allocation → Stratum mining → verified share accounting → pool payout reconciliation → BTC settlement. No simulated data can cross into the live settlement path.</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><a href="?route=generator" style={btn}>Open Generator</a><a href="?route=generator-production" style={btn}>Open Production Gate</a><button onClick={load} style={{...btn,cursor:'pointer'}}>Refresh</button></div></section>
    </div>
  </main>
}

const btn={display:'inline-block',padding:'11px 15px',border:'1px solid #3d6a49',borderRadius:10,background:'#0c2613',color:'#dfffe7',textDecoration:'none'} as const
function Metric({label,value,sub}:{label:string,value:number,sub:string}){return <div style={{padding:18,border:'1px solid #203b27',borderRadius:16,background:'#061109'}}><span style={{fontSize:12,color:'#9db6a4'}}>{label}</span><div style={{fontSize:34,fontWeight:800,margin:'4px 0'}}>{value}</div><small style={{color:'#8fa498'}}>{sub}</small></div>}
