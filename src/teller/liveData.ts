export type TellerNetworkSnapshot={
  observedAt:string
  counterparty:{status:'ONLINE'|'OFFLINE';source:string;version?:string}
  bitcoin:{status:'ONLINE'|'OFFLINE';source:string;blockHeight?:number}
  assets:Record<string,{status:'VERIFIED'|'UNAVAILABLE';issuer?:string;divisible?:boolean;locked?:boolean;source?:string}>
}

const gateway=(import.meta.env.VITE_NEO_TELLER_API_URL as string|undefined)?.replace(/\/$/,'')||''

export async function fetchTellerNetworkSnapshot():Promise<TellerNetworkSnapshot>{
  if(!gateway) throw new Error('VITE_NEO_TELLER_API_URL is not configured. Connect the read-only NEO Teller backend before enabling live network status.')
  const r=await fetch(`${gateway}/api/v1/teller/network`,{headers:{accept:'application/json'}})
  if(!r.ok) throw new Error(`NEO Teller gateway returned HTTP ${r.status}`)
  return r.json() as Promise<TellerNetworkSnapshot>
}
