import { createRedisCrawlQueue } from './redis-queue.mjs';
import { createEvidenceVaultSink } from './persistence.mjs';
import { createCrawlerWorker } from './worker.mjs';
import { createEvidenceVault } from '../neo-evidence-vault/store.mjs';
import { createRedisEventStore, ingestRouterEvent } from '../neo-router/event-engine.mjs';
import { createPersistentMissionRuntime } from '../neo-router/mission-runtime.mjs';

export function createCrawlerWorkerRuntime({
  queue=createRedisCrawlQueue(),
  vault=createEvidenceVault(process.env.NEO_EVIDENCE_DB_PATH||'data/neo-evidence-vault.sqlite'),
  eventStore=createRedisEventStore(),
  missionRuntime=createPersistentMissionRuntime()
}={}){
  const evidenceSink=createEvidenceVaultSink(vault);
  const routeEvent=event=>ingestRouterEvent({event,store:eventStore,runtime:missionRuntime});
  const worker=createCrawlerWorker({queue,evidenceSink,routeEvent});
  return Object.freeze({worker,queue,vault,eventStore,missionRuntime});
}
