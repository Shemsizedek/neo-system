export type RouterCapability='btc.read'|'btc.broadcast'|'counterparty.read'|'counterparty.compose'
export type RouterProvider={id:string;name?:string;baseUrl:string;priority:number;enabled:boolean;cors?:boolean;capabilities:RouterCapability[]}
type RouterConfig={version:number;policy?:{timeoutMs?:number};providers:RouterProvider[]}
type RouterState={providers?:Record<string,{healthy?:boolean;checkedAt?:string}>}

const FALLBACK:RouterConfig={version:1,policy:{timeoutMs:12000},providers:[
  {id:'bitcoin-blockstream',baseUrl:'https://blockstream.info/api',priority:10,enabled:true,cors:true,capabilities:['btc.read','btc.broadcast']},
  {id:'bitcoin-mempool',baseUrl:'https://mempool.space/api',priority:20,enabled:true,cors:true,capabilities:['btc.read','btc.broadcast']},
  {id:'counterparty-core',baseUrl:'https://api.counterparty.io:4000',priority:10,enabled:true,cors:true,capabilities:['counterparty.read','counterparty.compose']}
]}

let cache:Promise<{config:RouterConfig;state:RouterState}>|null=null
function pagesBase(){return String(import.meta.env.BASE_URL||'/neo-system/').replace(/\/?$/,'/')}
async function jsonOr<T>(url:string,fallback:T):Promise<T>{try{const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)return fallback;return await r.json() as T}catch{return fallback}}
export function loadRouter(){
  if(!cache)cache=Promise.all([
    jsonOr<RouterConfig>(`${pagesBase()}api/router/providers.json`,FALLBACK),
    jsonOr<RouterState>(`${pagesBase()}api/router/state.json`,{})
  ]).then(([config,state])=>({config:config?.providers?.length?config:FALLBACK,state}))
  return cache
}
export function refreshRouter(){cache=null;return loadRouter()}

export async function routerProviders(capability:RouterCapability){
  const{config,state}=await loadRouter()
  return config.providers.filter(p=>p.enabled&&p.cors!==false&&p.capabilities.includes(capability)&&state.providers?.[p.id]?.healthy!==false).sort((a,b)=>a.priority-b.priority)
}

export async function routedFetch(capability:RouterCapability,path:string,init?:RequestInit){
  const{config}=await loadRouter();const providers=await routerProviders(capability);const failures:string[]=[]
  if(!providers.length)throw new Error(`No healthy NEO Router provider for ${capability}`)
  for(const provider of providers){
    const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),config.policy?.timeoutMs??12000)
    try{
      const res=await fetch(`${provider.baseUrl.replace(/\/$/,'')}${path}`,{...init,signal:controller.signal})
      if(res.ok)return{res,provider}
      failures.push(`${provider.id}:${res.status}`)
      if(res.status>=400&&res.status<500&&res.status!==408&&res.status!==429)return{res,provider}
    }catch(e){failures.push(`${provider.id}:${e instanceof Error?e.message:'network'}`)}finally{window.clearTimeout(timer)}
  }
  throw new Error(`NEO Router exhausted providers (${failures.join(', ')})`)
}
