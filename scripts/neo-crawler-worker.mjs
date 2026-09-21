import { createCrawlerWorkerRuntime } from '../server/neo-crawler/worker-runtime.mjs';
const {worker}=createCrawlerWorkerRuntime();
const once=process.argv.includes('--once');
do{const result=await worker.runOnce();console.log(JSON.stringify(result));if(once||result.status==='IDLE')break;if(result.status!=='COMPLETED')await new Promise(r=>setTimeout(r,1000));}while(true);
