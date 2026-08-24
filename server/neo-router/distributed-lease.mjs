function encode(value){return encodeURIComponent(String(value))}
async function redisCommand(url,token,parts){const path=parts.map(encode).join('/');const res=await fetch(`${url}/${path}`,{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error(`Redis command failed: ${res.status}`);return res.json()}

export function createRedisLeaseManager({url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN,prefix='neo:router:lease'}={}){
  if(!url||!token)throw new Error('Redis lease manager requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
  const keyFor=(key)=>`${prefix}:${key}`
  return Object.freeze({
    mode:'redis',durable:true,
    async acquire(key,owner,ttlMs=60000){
      const result=await redisCommand(url,token,['set',keyFor(key),owner,'NX','PX',ttlMs])
      return result?.result==='OK'
    },
    async release(key,owner){
      const current=await redisCommand(url,token,['get',keyFor(key)])
      if(current?.result!==owner)return false
      await redisCommand(url,token,['del',keyFor(key)])
      return true
    },
    async inspect(key){const current=await redisCommand(url,token,['get',keyFor(key)]);return current?.result?{owner:current.result}:null},
  })
}
