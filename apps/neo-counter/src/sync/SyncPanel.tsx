import { useMemo, useState } from 'react';
import type { MerchantOpsState } from '../merchant/types';
import type { Session } from '../auth/session';
import { HttpSyncTransport, merchantEnvelope } from './client';
import { enqueue, flushQueue, pendingCount } from './queue';

type Props={state:MerchantOpsState;onRemote:(state:MerchantOpsState)=>void;online:boolean;session:Session|null};
const VERSION_KEY='neo-counter-sync-version-v1';

function version(){const raw=Number(localStorage.getItem(VERSION_KEY)||'0');return Number.isFinite(raw)?raw:0;}
function setVersion(v:number){localStorage.setItem(VERSION_KEY,String(v));}

export default function SyncPanel({state,onRemote,online,session}:Props){
  const transport=useMemo(()=>new HttpSyncTransport(),[]);
  const [localVersion,setLocalVersion]=useState(version);
  const [pending,setPending]=useState(pendingCount);
  const [message,setMessage]=useState('Sign in to a terminal/staff session to use shared state.');
  const terminalId=session?.terminalId||'';

  const guard=()=>{if(!session){setMessage('Authentication required before shared sync.');return false;}return true;};
  const push=async()=>{
    if(!guard()) return;
    const envelope=merchantEnvelope(state,terminalId,localVersion);
    if(!online){enqueue(envelope);setPending(pendingCount());setMessage('Offline: change queued for shared sync.');return;}
    try{const remote=await transport.push(envelope);setVersion(remote.version);setLocalVersion(remote.version);setMessage(`Pushed authoritative version ${remote.version}.`);}catch(error){enqueue(envelope);setPending(pendingCount());setMessage(error instanceof Error?`${error.message}; queued for retry.`:'Sync push failed; queued for retry.');}
  };

  const pull=async()=>{
    if(!guard()) return;
    if(!online){setMessage('Offline: cannot pull shared state.');return;}
    try{const snapshot=await transport.pull(state.merchant.id,localVersion);if(!snapshot){setMessage('No newer shared snapshot available.');return;}onRemote(snapshot.merchantOps.payload);setVersion(snapshot.merchantOps.version);setLocalVersion(snapshot.merchantOps.version);setMessage(`Pulled authoritative version ${snapshot.merchantOps.version}.`);}catch(error){setMessage(error instanceof Error?error.message:'Sync pull failed.');}
  };

  const flush=async()=>{
    if(!guard()) return;
    if(!online){setMessage('Offline: queued changes remain local.');return;}
    const result=await flushQueue(transport);setPending(result.pending);setMessage(`Sync queue: ${result.sent} sent, ${result.pending} pending.`);
  };

  return <section className="panel sync-panel"><div className="section-head"><div><h2>Shared Register Sync</h2><p>Authoritative merchant state across locations and terminals.</p></div><span>v{localVersion} · {pending} queued</span></div><div className="sync-actions"><button disabled={!session} onClick={pull}>Pull Shared State</button><button disabled={!session} onClick={push}>Push Local State</button><button disabled={!session} onClick={flush}>Flush Queue</button></div><p className="device-message">{message}</p><small>{session?`${session.staffId} · ${session.terminalId}`:'No authenticated terminal session'} · stale writes are rejected with HTTP 409.</small></section>;
}
