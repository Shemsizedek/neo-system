import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

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

export function createFileStateStore({file=process.env.NEO_ROUTER_STATE_FILE||'data/router/state.json'}={}){
  async function loadRaw(){
    try{return JSON.parse(await readFile(file,'utf8'))}
    catch(error){if(error?.code==='ENOENT')return null;throw error}
  }
  return Object.freeze({
    mode:'github-file',
    durable:true,
    async load(){return await loadRaw()},
    async save(next){
      const current=await loadRaw()||{}
      const now=new Date().toISOString()
      const payload={...current,...clone(next),version:current.version??1,storage:'github',updatedAt:now,lastRun:{workerId:process.env.NEO_ROUTER_WORKER_ID||'local',at:now,runId:process.env.GITHUB_RUN_ID||null}}
      await mkdir(dirname(file),{recursive:true})
      const temp=`${file}.tmp`
      await writeFile(temp,`${JSON.stringify(payload,null,2)}\n`,'utf8')
      await rename(temp,file)
      return {ok:true,mode:'github-file',file}
    },
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
  if(options.mode==='file'||process.env.NEO_ROUTER_STORAGE==='github'||process.env.GITHUB_ACTIONS==='true')return createFileStateStore(options)
  return createUpstashStateStore(options) ?? createFileStateStore(options)
}
