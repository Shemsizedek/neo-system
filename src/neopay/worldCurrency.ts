import {getAddressAssetsIssued} from './counterpartyService'

export const TREASURY_ADDRESS='18FyntJG9hdXYvanm67mGgbyo1P7adckvg'
export const WORLD_CURRENCY_CODES=new Set(['NOMNI','NMNI','SVC','MRC','MOR','MXC','NEO','BTC','XCP','ERC','STC','RPC','ADC','CDC','SGC','SWC','OLM','RGC','YNC','RMC','ZLC','BHC','FTC','DMC','HGC','PTN','RDC','KRC','RHC','RYC','REL','LRC','WNC','PDC','DRC','KNC','RBC','SLC','ILC','TWC','CZK','DGC','HVC','NRC','LUC','TKC','SCH','LRH','FJC','BVC','KUC','SMC','LVC','IRR','CRC','JMC','GHC','KZC','EGC','TNC','LEC','QZC','BOC','ZWC','BJC','LKC','BNC','PAC','LPC','GRC','BRC','NAC','KAC','PCA','CBC','BMC','TGC','BLC','MKA','GYC','EYC','MNC','MTC','SOC','LNC','PGC','BZC','MWC','GMC','GDC','RFC','DBC','TJC','KTC','LOT','LEU','RLC','DEN','VUC','OYC','LGC','ESC','BSC','CPN','NLC','TLC','LUG','NFC','TVC','MBT','SYG','ZMC','GEC'])

export type AcceptedPayment={asset:string;name?:string;class:'World Currency'|'NEOfx';issuer:string;symbol:string}
export async function getAcceptedTreasuryPayments():Promise<AcceptedPayment[]>{
 const rows=await getAddressAssetsIssued(TREASURY_ADDRESS)
 const seen=new Set<string>(),out:AcceptedPayment[]=[]
 for(const row of rows){const asset=String(row.asset||row.asset_name||'').toUpperCase();if(!asset||seen.has(asset))continue;seen.add(asset);out.push({asset,name:row.asset_longname||row.description||undefined,class:WORLD_CURRENCY_CODES.has(asset)?'World Currency':'NEOfx',issuer:TREASURY_ADDRESS,symbol:asset==='NOMNI'?'∞':asset})}
 return out.sort((a,b)=>a.class.localeCompare(b.class)||a.asset.localeCompare(b.asset))
}

export function displayMoney(amount:number|string,currency?:string){const n=Number(amount||0);const code=String(currency||'NEO').toUpperCase();const symbols:Record<string,string>={USD:'$',EUR:'€',GBP:'£',JPY:'¥',CNY:'¥',BTC:'₿',NOMNI:'∞',NEO:'∞',XCP:'∞'};const mark=symbols[code]||'∞';return `${mark}${Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:8}):amount}`}
