export type CesProfile={accountNumber:string;walletAddress:string}
export type CesTraderData={balance?:number;currency?:string;transactions:any[];online:boolean;message?:string}
const KEY='neopay-ces-profile'

export function loadCesProfile(walletAddress:string):CesProfile{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return{accountNumber:String(v.accountNumber||''),walletAddress:String(v.walletAddress||walletAddress)}}catch{return{accountNumber:'',walletAddress}}}
export function saveCesProfile(profile:CesProfile){localStorage.setItem(KEY,JSON.stringify(profile))}

export async function getCesTraderData(profile:CesProfile):Promise<CesTraderData>{
 const base=String(import.meta.env.VITE_CES_API_BASE||'').replace(/\/$/,'')
 if(!profile.accountNumber)return{transactions:[],online:false,message:'Enter your CES Account Number to link this wallet for CES exchange.'}
 if(!base)return{transactions:[],online:false,message:'CES account saved. Live CES balance/history will appear when the authorized CES API endpoint is configured.'}
 const url=`${base}/trader/${encodeURIComponent(profile.accountNumber)}?wallet=${encodeURIComponent(profile.walletAddress)}`
 const r=await fetch(url,{headers:{accept:'application/json'},credentials:'omit'})
 if(!r.ok)throw new Error(`CES API ${r.status}`)
 const d=await r.json()
 return{balance:Number(d.balance??0),currency:String(d.currency||'CES'),transactions:Array.isArray(d.transactions)?d.transactions:[],online:true}
}
