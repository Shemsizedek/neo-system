import { createRedisCrawlQueue } from './redis-queue.mjs';
import { createEvidenceVaultSink } from './persistence.mjs';
import { createCrawlerWorker } from './worker.mjs';
import { createEvidenceVault } from '../neo-evidence-vault/store.mjs';
import { createRedisEventStore, ingestRouterEvent } from '../neo-router/event-engine.mjs';
import { createPersistentMissionRuntime } from '../neo-router/mission-runtime.mjs';
import { createRedisLeaseManager } from '../neo-router/distributed-lease.mjs';

export function createCrawlerWorkerRuntime({
  queue=createRedisCrawlQueue(),
  vault=createEvidenceVault(process.env.NEO_EVIDENCE_DB_PATH||'data/neo-evidence-vault.sqlite'),
  eventStore=createRedisEventStore(),
  missionRuntime=createPersistentMissionRuntime(),
  routeLease=createRedisLeaseManager({prefix:'neo:router:event-ingest'})
}={}){
  const evidenceSink=createEvidenceVaultSink(vault);
  const routeEvent=async event=>{
    const leaseId='mission-state';
    const owner=`crawler-${event.id}`;
    const acquired=await routeLease.acquire(leaseId,owner);
    if(!acquired)throw new Error('router_state_busy');
    try{return await ingestRouterEvent({event,store:eventStore,runtime:missionRuntime})}
    finally{await routeLease.release(leaseId,owner)}
  };
  const worker=createCrawlerWorker({queue,evidenceSink,routeEvent});
  return Object.freeze({worker,queue,vault,eventStore,missionRuntime,routeLease});
}
