import type { SyncEnvelope, SyncQueueItem, SyncTransport } from './types';

const QUEUE_KEY='neo-counter-sync-queue-v1';

function loadQueue():SyncQueueItem[]{
  try{const raw=localStorage.getItem(QUEUE_KEY);return raw?JSON.parse(raw) as SyncQueueItem[]:[];}catch{return [];}
}
function saveQueue(items:SyncQueueItem[]){localStorage.setItem(QUEUE_KEY,JSON.stringify(items.slice(-200)));}

export function enqueue(envelope:SyncEnvelope){
  const queue=loadQueue();
  queue.push({id:crypto.randomUUID(),envelope,attempts:0,queuedAt:new Date().toISOString()});
  saveQueue(queue);
}

export function pendingCount(){return loadQueue().length;}

export async function flushQueue(transport:SyncTransport){
  const queue=loadQueue();
  const remaining:SyncQueueItem[]=[];
  for(const item of queue){
    try{await transport.push(item.envelope);}catch(error){remaining.push({...item,attempts:item.attempts+1,lastError:error instanceof Error?error.message:'Sync failed'});}
  }
  saveQueue(remaining);
  return {sent:queue.length-remaining.length,pending:remaining.length};
}
