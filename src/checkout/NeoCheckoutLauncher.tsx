import {useEffect,useMemo,useState} from 'react'
import './checkout.css'

type CurrencyEntry={id:string;symbol:string;name:string;counterpartyAsset:string|null;mappingStatus:string}
type CurrencyPayload={currencies?:CurrencyEntry[]}
type Props={serviceId:string;serviceName:string;defaultAmountCents?:number;label?:string}
const API='/neo-system/api/neo-counter/currencies.json',GATEWAY='/neo-system/neo-counter/'

export function NeoCheckoutLauncher({serviceId,serviceName,defaultAmountCents=2500,label}:Props){
 const[expanded,setExpanded]=useState(false),[amount,setAmount]=useState(String((defaultAmountCents/100).toFixed(2))),[currencies,setCurrencies]=useState<CurrencyEntry[]>([]),[currency,setCurrency]=useState('NMNI'),[loadState,setLoadState]=useState<'loading'|'ready'|'error'>('loading')
 useEffect(()=>{let cancelled=false;fetch(API,{headers:{accept:'application/json'}}).then(r=>{if(!r.ok)throw new Error('currency registry unavailable');return r.json() as Promise<CurrencyPayload>}).then(p=>{if(!cancelled){setCurrencies(p.currencies||[]);setLoadState('ready')}}).catch(()=>{if(!cancelled)setLoadState('error')});return()=>{cancelled=true}},[])
 const selected=useMemo(()=>currencies.find(c=>c.symbol===currency),[currencies,currency]),cents=Math.round(Number(amount)*100),mappedAsset=selected?.counterpartyAsset||null,rail=mappedAsset==='BTC'?'BTC':mappedAsset==='NOMNI'?'NOMNI':mappedAsset?'XCP':'BTC'
 const openCheckout=()=>{if(!Number.isSafeInteger(cents)||cents<=0)return;const orderId=`${serviceId}-${Date.now()}`;sessionStorage.setItem(`neo-checkout-order:${serviceId}`,orderId);const url=new URL(GATEWAY,window.location.origin);url.searchParams.set('checkout','1');url.searchParams.set('service',serviceId);url.searchParams.set('order',orderId);url.searchParams.set('label',label||`${serviceName} Checkout`);url.searchParams.set('amount',String(cents));url.searchParams.set('currency',currency);url.searchParams.set('rail',rail);if(mappedAsset)url.searchParams.set('asset',mappedAsset);url.searchParams.set('success_url',window.location.href);url.searchParams.set('cancel_url',window.location.href);window.location.assign(url.toString())}
 return <section className="neo-checkout-compact" aria-label={`${serviceName} NEO checkout`}>
  <button className="neo-checkout-toggle" type="button" onClick={()=>setExpanded(v=>!v)}><span><strong>Checkout</strong><small>NEO Counter</small></span><b>{expanded?'Close':'Pay'}</b></button>
  {expanded&&<div className="neo-checkout-body"><div className="neo-checkout-grid"><label>Amount (USD)<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></label><label>World Currency<select value={currency} onChange={e=>setCurrency(e.target.value)} disabled={loadState!=='ready'}>{currencies.map(c=><option key={c.id} value={c.symbol}>{c.symbol} — {c.name}</option>)}</select></label><button onClick={openCheckout} disabled={!Number.isSafeInteger(cents)||cents<=0}>Continue</button></div><p>{loadState==='error'?'Currency registry unavailable.':mappedAsset?`Settlement: ${rail} · ${mappedAsset}`:`${currency} requires verified asset mapping for token settlement.`}</p></div>}
 </section>
}
