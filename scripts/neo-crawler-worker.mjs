import { createCrawlerWorkerRuntime } from '../server/neo-crawler/worker-runtime.mjs';
const {worker}=createCrawlerWorkerRuntime();
const once=process.argv.includes('--once');
const idleMs=Math.max(250,Number(process.env.NEO_CRAWLER_IDLE_MS||2000));
do{
  const result=await worker.runOnce();console.log(JSON.stringify(result));
  if(once)break;
  if(result.status==='IDLE'||result.status!=='COMPLETED')await new Promise(r=>setTimeout(r,idleMs));
}while(true);
