import { useMemo, useState } from 'react';
import type { MerchantOpsState } from '../merchant/types';
import { HttpSyncTransport, merchantEnvelope } from './client';
import { enqueue, flushQueue, pendingCount } from './queue';

type Props={state:MerchantOpsState;onRemote:(state:MerchantOpsState)=>void;online:boolean};
const VERSION_KEY='neo-counter-sync-version-v1';
const TERMINAL_ID=localStorage.getItem('neo-counter-terminal-id') || 'neo-terminal-demo-01';

function version(){const raw=Number(localStorage.getItem(VERSION_KEY)||'0');return Number.isFinite(raw)?raw:0;}
function setVersion(v:number){localStorage.setItem(VERSION_KEY,String(v));}

export default function SyncPanel({state,onRemote,online}:Props){
  const transport=useMemo(()=>new HttpSyncTransport(),[]);
  const [localVersion,setLocalVersion]=useState(version);
  const [pending,setPending]=useState(pendingCount);
  const [message,setMessage]=useState('Local-first mode. Configure VITE_NEO_COUNTER_SYNC_ENDPOINT to enable shared state.');

  const push=async()=>{
    const nextVersion=localVersion+1;
    const envelope=merchantEnvelope(state,TERMINAL_ID,nextVersion);
    if(!online){enqueue(envelope);setPending(pendingCount());setMessage('Offline: change queued for shared sync.');return;}
    try{const remote=await transport.push(envelope);setVersion(remote.version);setLocalVersion(remote.version);setMessage(`Pushed authoritative version ${remote.version}.`);}catch(error){enqueue(envelope);setPending(pendingCount());setMessage(error instanceof Error?`${error.message}; queued for retry.`:'Sync push failed; queued for retry.');}
  };

  const pull=async()=>{
    if(!online){setMessage('Offline: cannot pull shared state.');return;}
    try{const snapshot=await transport.pull(state.merchant.id,localVersion);if(!snapshot){setMessage('No newer shared snapshot available.');return;}onRemote(snapshot.merchantOps.payload);setVersion(snapshot.merchantOps.version);setLocalVersion(snapshot.merchantOps.version);setMessage(`Pulled authoritative version ${snapshot.merchantOps.version}.`);}catch(error){setMessage(error instanceof Error?error.message:'Sync pull failed.');}
  };

  const flush=async()=>{
    if(!online){setMessage('Offline: queued changes remain local.');return;}
    const result=await flushQueue(transport);setPending(result.pending);setMessage(`Sync queue: ${result.sent} sent, ${result.pending} pending.`);
  };

  return <section className="panel sync-panel"><div className="section-head"><div><h2>Shared Register Sync</h2><p>Authoritative merchant state across locations and terminals.</p></div><span>v{localVersion} · {pending} queued</span></div><div className="sync-actions"><button onClick={pull}>Pull Shared State</button><button onClick={push}>Push Local State</button><button onClick={flush}>Flush Queue</button></div><p className="device-message">{message}</p><small>Conflict-safe contract: server may reject stale writes with HTTP 409. No silent overwrite of newer remote state.</small></section>;
}
