export type CesProfile={accountNumber:string;walletAddress:string}
export type CesTraderData={balance?:number;currency?:string;transactions:any[];online:boolean;message?:string}
const KEY='neopay-ces-profile'

export function loadCesProfile(walletAddress:string):CesProfile{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return{accountNumber:String(v.accountNumber||''),walletAddress:String(v.walletAddress||walletAddress)}}catch{return{accountNumber:'',walletAddress}}}
export function saveCesProfile(profile:CesProfile){localStorage.setItem(KEY,JSON.stringify(profile))}

export async function getCesTraderData(profile:CesProfile):Promise<CesTraderData>{
 const base=String(import.meta.env.VITE_CES_API_BASE||'').replace(/\/$/,'')
 if(!profile.accountNumber)return{transactions:[],online:false,message:'Enter your CES Account Number to link this wallet for CES exchange.'}
 if(!base)return{transactions:[],online:false,message:'CES account saved. Live CES balance/history will appear when the authorized CES API endpoint is configured.'}
 const r=await fetch(`${base}/community/status`,{headers:{accept:'application/json'},credentials:'omit'})
 if(!r.ok)throw new Error(`CES API ${r.status}`)
 const d=await r.json()
 return{transactions:[],online:d.database==='connected',message:d.database==='connected'?'CES database connected. Sign in to NEO Bank to view protected account balances and history.':'CES database is currently unavailable.'}
}
