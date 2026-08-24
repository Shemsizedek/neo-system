function enc(v){return encodeURIComponent(String(v))}
async function cmd(url,token,parts){const r=await fetch(`${url}/${parts.map(enc).join('/')}`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error(`Redis command failed: ${r.status}`);return r.json()}

export function createMemoryDeadLetterQueue(){const items=[];return Object.freeze({mode:'memory',durable:false,async push(item){items.unshift(structuredClone(item));return item},async list(limit=50){return items.slice(0,limit).map(item=>structuredClone(item))},async clear(){items.splice(0);return true}})}

export function createRedisDeadLetterQueue({url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN,key='neo:router:dead-letter'}={}){
  if(!url||!token)return createMemoryDeadLetterQueue()
  return Object.freeze({mode:'redis',durable:true,
    async push(item){const payload=JSON.stringify({...item,deadLetteredAt:new Date().toISOString()});await cmd(url,token,['lpush',key,payload]);await cmd(url,token,['ltrim',key,0,499]);return item},
    async list(limit=50){const res=await cmd(url,token,['lrange',key,0,Math.max(0,limit-1)]);return (res?.result??[]).map(x=>{try{return JSON.parse(x)}catch{return {raw:x}}})},
    async clear(){await cmd(url,token,['del',key]);return true},
  })
}
