export type MarketRates={btcUsd:number;xcpUsd:number;nomniXcp:number;nomniUsd:number;nomniBtc:number;updatedAt:string;source?:string}

async function json(url:string){const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`Market API ${r.status}`);return r.json()}

export async function getMarketRates(nomniXcp:number):Promise<MarketRates>{
 const bankBase=String(import.meta.env.VITE_CES_API_BASE||'https://neobank.holytemples.org/api/v1').replace(/\/$/,'')
 const [bank,cg,btcFallback]=await Promise.allSettled([
  json(`${bankBase}/nomni/valuation`),
  json('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,counterparty&vs_currencies=usd'),
  json('https://mempool.space/api/v1/prices')
 ])
 const live:any=bank.status==='fulfilled'?bank.value:{}
 const c:any=cg.status==='fulfilled'?cg.value:{}
 const b:any=btcFallback.status==='fulfilled'?btcFallback.value:{}
 const btcUsd=Number(live?.btcUsd??c?.bitcoin?.usd??b?.USD??0)
 const xcpUsd=Number(live?.xcpUsd??c?.counterparty?.usd??0)
 if(live?.available&&Number(live.nomniUsd)>0)return{btcUsd,xcpUsd,nomniXcp:Number(live.nomniXcp||0),nomniUsd:Number(live.nomniUsd),nomniBtc:Number(live.nomniBtc||0),updatedAt:String(live.observedAt||new Date().toISOString()),source:String(live.source||'Live NEO Bank valuation')}
 const raw=Number.isFinite(nomniXcp)&&nomniXcp>0?nomniXcp:0
 const px=raw>1_000_000?raw/100_000_000:raw
 const nomniUsd=px&&xcpUsd?px*xcpUsd:0
 const nomniBtc=nomniUsd&&btcUsd?nomniUsd/btcUsd:0
 return{btcUsd,xcpUsd,nomniXcp:px,nomniUsd,nomniBtc,updatedAt:new Date().toISOString(),source:nomniUsd?'Local live NOMNI/XCP order book + USD spot rate':undefined}
}
