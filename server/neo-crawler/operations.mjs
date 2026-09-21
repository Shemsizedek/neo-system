import { createRedisCrawlQueue } from './redis-queue.mjs';
export function createCrawlerOperations(options={}){
  const queue=options.queue||createRedisCrawlQueue(options);
  return Object.freeze({
    queue,
    async health(){try{const telemetry=await queue.telemetry();return {ok:true,service:'NEO Crawler Operations',queue:telemetry}}catch(error){return {ok:false,service:'NEO Crawler Operations',error:String(error?.message||error)} }},
    async recoverDeadLetter(id){return queue.requeue(id)}
  });
}
