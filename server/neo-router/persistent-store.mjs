function clone(v){return structuredClone(v)}

export function createMemoryStateStore(initial=null){
  let value=initial?clone(initial):null
  return Object.freeze({
    mode:'memory',
    durable:false,
    async load(){return value?clone(value):null},
    async save(next){value=clone(next);return {ok:true,mode:'memory'}},
  })
}

export function createUpstashStateStore({url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN,key=process.env.NEO_ROUTER_STATE_KEY||'neo-router:mission-engine:v3'}={}){
  if(!url||!token) return null
  const endpoint=url.replace(/\/$/,'')
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'}
  async function command(args){
    const res=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(args)})
    if(!res.ok) throw new Error(`Upstash state store error: ${res.status}`)
    const data=await res.json()
    if(data.error) throw new Error(`Upstash state store error: ${data.error}`)
    return data.result
  }
  return Object.freeze({
    mode:'upstash-redis',
    durable:true,
    async load(){const raw=await command(['GET',key]);return raw?JSON.parse(raw):null},
    async save(next){await command(['SET',key,JSON.stringify(next)]);return {ok:true,mode:'upstash-redis'}},
  })
}

export function createMissionStateStore(options={}){
  return createUpstashStateStore(options) ?? createMemoryStateStore(options.initial)
}
