import type { MerchantOpsState } from '../merchant/types';
import { authHeaders } from '../auth/session';
import type { SyncEnvelope, SyncSnapshot, SyncTransport } from './types';

const SYNC_ENDPOINT=import.meta.env.VITE_NEO_COUNTER_SYNC_ENDPOINT || '';

export class HttpSyncTransport implements SyncTransport{
  constructor(private endpoint=SYNC_ENDPOINT){}
  async pull(merchantId:string,afterVersion=0):Promise<SyncSnapshot|null>{
    if(!this.endpoint) return null;
    const res=await fetch(`${this.endpoint.replace(/\/$/,'')}/merchant/${encodeURIComponent(merchantId)}/snapshot?afterVersion=${afterVersion}`,{headers:authHeaders()});
    if(res.status===204) return null;
    if(res.status===401) throw new Error('Session expired. Sign in again.');
    if(res.status===403) throw new Error('Your staff role cannot read shared merchant state.');
    if(!res.ok) throw new Error(`Sync pull failed (${res.status})`);
    return res.json();
  }
  async push(envelope:SyncEnvelope):Promise<SyncEnvelope>{
    if(!this.endpoint) throw new Error('Shared sync endpoint is not configured.');
    const res=await fetch(`${this.endpoint.replace(/\/$/,'')}/sync`,{method:'POST',headers:{'content-type':'application/json',...authHeaders()},body:JSON.stringify(envelope)});
    if(res.status===409){
      const remote=await res.json();
      throw Object.assign(new Error('Sync conflict'),{code:'SYNC_CONFLICT',remote});
    }
    if(res.status===401) throw new Error('Session expired. Sign in again.');
    if(res.status===403) throw new Error('Your staff role cannot push this type of change.');
    if(!res.ok) throw new Error(`Sync push failed (${res.status})`);
    return res.json();
  }
}

export function merchantEnvelope(state:MerchantOpsState,terminalId:string,version:number):SyncEnvelope<MerchantOpsState>{
  return {id:`merchant_ops:${state.merchant.id}`,entity:'merchant_ops',merchantId:state.merchant.id,terminalId,version,updatedAt:new Date().toISOString(),payload:state};
}
