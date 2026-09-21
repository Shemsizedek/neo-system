import { randomUUID } from 'node:crypto';

const enc=v=>encodeURIComponent(String(v));
async function cmd(url,token,parts){const r=await fetch(`${url}/${parts.map(enc).join('/')}`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error(`Redis command failed: ${r.status}`);return r.json();}
export function createRedisCrawlQueue({url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN,key='neo:crawler:queue',maxAttempts=3}={}){
  if(!url||!token) throw new Error('crawler_redis_not_configured');
  const item=id=>`${key}:item:${id}`, queued=`${key}:queued`, dead=`${key}:dead`;
  async function save(job){await cmd(url,token,['set',item(job.id),JSON.stringify(job)]);return job}
  async function get(id){const r=await cmd(url,token,['get',item(id)]);return r?.result?JSON.parse(r.result):null}
  return Object.freeze({mode:'redis',durable:true,
    async enqueue(input,meta={}){const now=new Date().toISOString(),job={id:randomUUID(),input:structuredClone(input),meta:structuredClone(meta),status:'QUEUED',attempts:0,maxAttempts,claimToken:null,createdAt:now,updatedAt:now,lastError:null};await save(job);await cmd(url,token,['rpush',queued,job.id]);return job},
    async claim(){const popped=await cmd(url,token,['lpop',queued]);const id=popped?.result;if(!id)return null;const job=await get(id);if(!job||job.status!=='QUEUED')return null;job.status='RUNNING';job.attempts+=1;job.claimToken=randomUUID();job.updatedAt=new Date().toISOString();return save(job)},
    async complete(id,result,claimToken){const job=await get(id);assertClaim(job,claimToken);job.status='COMPLETED';job.result=structuredClone(result);job.claimToken=null;job.updatedAt=new Date().toISOString();return save(job)},
    async fail(id,error,claimToken){const job=await get(id);assertClaim(job,claimToken);job.lastError=String(error?.message||error);job.claimToken=null;job.updatedAt=new Date().toISOString();job.status=job.attempts<job.maxAttempts?'QUEUED':'DEAD_LETTER';await save(job);await cmd(url,token,[job.status==='QUEUED'?'rpush':'lpush',job.status==='QUEUED'?queued:dead,job.id]);return job},
    async requeue(id){const job=await get(id);if(!job||job.status!=='DEAD_LETTER')throw new Error('crawler_job_not_dead_letter');job.status='QUEUED';job.attempts=0;job.lastError=null;job.updatedAt=new Date().toISOString();await save(job);await cmd(url,token,['rpush',queued,id]);return job},
    async get(id){return get(id)},
    async telemetry(){const [q,d]=await Promise.all([cmd(url,token,['llen',queued]),cmd(url,token,['llen',dead])]);return {mode:'redis',durable:true,queued:Number(q?.result||0),deadLetter:Number(d?.result||0),key}}
  });
}
function assertClaim(job,token){if(!job)throw new Error('crawl_job_not_found');if(job.status!=='RUNNING')throw new Error('crawl_job_not_running');if(token&&token!==job.claimToken)throw new Error('stale_crawl_claim')}
