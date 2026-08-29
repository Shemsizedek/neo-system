import {useEffect,useMemo,useState} from 'react'

type CurrencyEntry={id:string;symbol:string;name:string;counterpartyAsset:string|null;mappingStatus:string}
type CurrencyPayload={currencies?:CurrencyEntry[]}

type Props={serviceId:string;serviceName:string;defaultAmountCents?:number;label?:string}

const API='/neo-system/api/neo-counter/currencies.json'
const GATEWAY='/neo-system/neo-counter/'

export function NeoCheckoutLauncher({serviceId,serviceName,defaultAmountCents=2500,label}:Props){
 const[amount,setAmount]=useState(String((defaultAmountCents/100).toFixed(2)))
 const[currencies,setCurrencies]=useState<CurrencyEntry[]>([])
 const[currency,setCurrency]=useState('NMNI')
 const[loadState,setLoadState]=useState<'loading'|'ready'|'error'>('loading')
 useEffect(()=>{let cancelled=false;fetch(API,{headers:{accept:'application/json'}}).then(r=>{if(!r.ok)throw new Error('currency registry unavailable');return r.json() as Promise<CurrencyPayload>}).then(p=>{if(cancelled)return;setCurrencies(p.currencies||[]);setLoadState('ready')}).catch(()=>{if(!cancelled)setLoadState('error')});return()=>{cancelled=true}},[])
 const selected=useMemo(()=>currencies.find(c=>c.symbol===currency),[currencies,currency])
 const cents=Math.round(Number(amount)*100)
 const mappedAsset=selected?.counterpartyAsset||null
 const rail=mappedAsset==='BTC'?'BTC':mappedAsset==='NOMNI'?'NOMNI':mappedAsset?'XCP':'BTC'
 const openCheckout=()=>{
   if(!Number.isSafeInteger(cents)||cents<=0)return
   const orderId=`${serviceId}-${Date.now()}`
   sessionStorage.setItem(`neo-checkout-order:${serviceId}`,orderId)
   const url=new URL(GATEWAY,window.location.origin)
   url.searchParams.set('checkout','1')
   url.searchParams.set('service',serviceId)
   url.searchParams.set('order',orderId)
   url.searchParams.set('label',label||`${serviceName} Checkout`)
   url.searchParams.set('amount',String(cents))
   url.searchParams.set('currency',currency)
   url.searchParams.set('rail',rail)
   if(mappedAsset)url.searchParams.set('asset',mappedAsset)
   url.searchParams.set('success_url',window.location.href)
   url.searchParams.set('cancel_url',window.location.href)
   window.location.assign(url.toString())
 }
 return <section aria-label={`${serviceName} NEO checkout`} style={{margin:'16px 0',padding:16,border:'1px solid rgba(91,255,154,.28)',borderRadius:14,background:'rgba(5,20,12,.72)',color:'#d9ffe3'}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><strong style={{display:'block'}}>NEO Counter Checkout</strong><small style={{opacity:.72}}>Shared Treasury World Currency gateway</small></div><span style={{fontSize:12,opacity:.72}}>{loadState==='ready'?`${currencies.length} currency entries`:loadState==='error'?'Registry unavailable':'Loading currencies…'}</span></div>
   <div style={{display:'grid',gridTemplateColumns:'minmax(120px,1fr) minmax(180px,1.5fr) auto',gap:10,marginTop:12}}>
     <label style={{display:'grid',gap:5,fontSize:12}}>Amount (USD)<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" style={{padding:10,borderRadius:8,border:'1px solid #315341',background:'#07110c',color:'inherit'}}/></label>
     <label style={{display:'grid',gap:5,fontSize:12}}>World Currency<select value={currency} onChange={e=>setCurrency(e.target.value)} disabled={loadState!=='ready'} style={{padding:10,borderRadius:8,border:'1px solid #315341',background:'#07110c',color:'inherit'}}>{currencies.map(c=><option key={c.id} value={c.symbol}>{c.symbol} — {c.name}</option>)}</select></label>
     <button onClick={openCheckout} disabled={!Number.isSafeInteger(cents)||cents<=0} style={{alignSelf:'end',padding:'11px 16px',borderRadius:8,border:'1px solid #58d98b',background:'#10351f',color:'#d9ffe3',fontWeight:700,cursor:'pointer'}}>Pay with NEO Counter</button>
   </div>
   <p style={{margin:'10px 0 0',fontSize:12,opacity:.72}}>{mappedAsset?`Settlement rail: ${rail} · verified asset mapping ${mappedAsset}`:`${currency} is supported as a Treasury catalog/display currency; exact Counterparty asset mapping is still required before token settlement can be verified automatically.`}</p>
 </section>
}
