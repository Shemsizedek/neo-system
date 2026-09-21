import { createHash } from 'node:crypto';
import { neoCrawler } from './index.mjs';
import { createEvidenceVaultSink } from './persistence.mjs';
import { createCrawlerRouteEvent } from './router-contract.mjs';

export function createCrawlerWorker({queue,crawler=neoCrawler,evidenceSink,routeEvent}={}){
  if(!queue?.claim||!queue?.complete||!queue?.fail)throw new TypeError('crawler queue contract required');
  if(!evidenceSink?.persist)throw new TypeError('crawler evidence sink required');
  if(typeof routeEvent!=='function')throw new TypeError('crawler routeEvent contract required');
  async function runOnce(){
    const job=await queue.claim(); if(!job)return {status:'IDLE'};
    try{
      const envelope=await crawler.crawl(job.input,job.meta?.crawlOptions||{});
      const evidence=await evidenceSink.persist(envelope);
      const event=createCrawlerRouteEvent(envelope,job.meta?.targets);
      event.id=job.meta?.eventId||eventId(job,envelope);
      const routed=await routeEvent(event);
      const missionId=routed?.mission?.id||routed?.event?.missionId||null;
      await queue.complete(job.id,{evidenceIds:evidence.map(x=>x.id),eventId:event.id,missionId},job.claimToken);
      return {status:'COMPLETED',jobId:job.id,eventId:event.id,evidenceCount:evidence.length,missionId};
    }catch(error){
      const failed=await queue.fail(job.id,error,job.claimToken);
      return {status:failed.status,jobId:job.id,error:String(error?.message||error)};
    }
  }
  return Object.freeze({runOnce});
}
function eventId(job,envelope){return 'crawler-'+createHash('sha256').update(JSON.stringify({jobId:job.id,adapter:envelope.adapter})).digest('hex').slice(0,24)}
