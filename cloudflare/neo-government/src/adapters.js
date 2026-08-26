const RAW='https://raw.githubusercontent.com/Shemsizedek/neo-system/main/';

export const ADAPTERS=[
  {id:'executive',name:'NEOsync Executive Office',kind:'service-or-repository',env:'NEOSYNC_API_URL',healthPath:'/health',repoPath:'server/neo-router/executive-command.mjs'},
  {id:'central-solution',name:'Central Solution Office & Private Chambers',kind:'government-store',repoPath:'src/neoSystem.ts'},
  {id:'tribunal',name:'Inner Bar Temple Tribunal',kind:'service-or-repository',env:'TRIBUNAL_API_URL',healthPath:'/health',repoPath:'server/tribunal-backend/server.mjs'},
  {id:'chaplaincy',name:'World Chaplaincy E-File',kind:'service-or-repository',env:'TRIBUNAL_API_URL',healthPath:'/health',repoPath:'src/tribunal/efile.ts'},
  {id:'treasury',name:'NEO Treasury Management System',kind:'government-store',repoPath:'src/treasury/treasurySystem.ts'},
  {id:'router',name:'NEO Router',kind:'service-or-repository',env:'ROUTER_API_URL',healthPath:'/health',repoPath:'server/neo-router/worker-v4.mjs'},
  {id:'police',name:'World Police',kind:'government-store',repoPath:'src/neoSystem.ts'},
  {id:'marshals',name:'World Marshals',kind:'government-store',repoPath:'src/neoSystem.ts'},
  {id:'guards',name:'World Guards',kind:'government-store',repoPath:'src/neoSystem.ts'},
  {id:'defense',name:'World Defense System',kind:'government-store',repoPath:'src/neoSystem.ts'},
  {id:'global-arms',name:'NEO Global Arms System',kind:'repository-engine',repoPath:'src/globalArmsSystem.ts'},
  {id:'cipher',name:'NEO Cipher',kind:'repository-engine',repoPath:'registry/neo-lingo.yaml'}
];

const cleanBase=v=>String(v||'').replace(/\/+$/,'');
async function timedFetch(url,init={},timeout=4000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);try{return await fetch(url,{...init,signal:controller.signal,headers:{accept:'application/json,text/plain,*/*',...(init.headers||{})}})}finally{clearTimeout(timer)}}

export function adapterById(id){return ADAPTERS.find(a=>a.id===id)||null}

export async function inspectAdapter(adapter,env){
  const checkedAt=new Date().toISOString();
  const configured=adapter.env?cleanBase(env[adapter.env]):'';
  if(configured){
    const url=configured+(adapter.healthPath||'/health');
    try{
      const r=await timedFetch(url,{},4500);let detail='';try{detail=(await r.text()).slice(0,300)}catch{}
      return {...adapter,mode:'live-service',state:r.ok?'LIVE':'DEGRADED',httpStatus:r.status,endpoint:configured,checkedAt,detail};
    }catch(error){return {...adapter,mode:'live-service',state:'OFFLINE',endpoint:configured,checkedAt,error:String(error?.message||error)}}
  }
  if(adapter.kind==='government-store')return {...adapter,mode:'native-government-store',state:'LIVE',endpoint:'GOV_STORE',checkedAt};
  try{
    const r=await timedFetch(RAW+adapter.repoPath,{},3500);
    return {...adapter,mode:'repository-engine',state:r.ok?'REPOSITORY':'UNAVAILABLE',httpStatus:r.status,endpoint:RAW+adapter.repoPath,checkedAt};
  }catch(error){return {...adapter,mode:'repository-engine',state:'UNAVAILABLE',endpoint:RAW+adapter.repoPath,checkedAt,error:String(error?.message||error)}}
}

export async function inspectAllAdapters(env){return Promise.all(ADAPTERS.map(a=>inspectAdapter(a,env)))}

export async function proxyAdapter(adapter,env,subpath,request){
  const base=adapter.env?cleanBase(env[adapter.env]):'';
  if(!base)return new Response(JSON.stringify({ok:false,error:'Adapter has no configured live service.',adapter:adapter.id,state:'REPOSITORY'}),{status:503,headers:{'content-type':'application/json'}});
  const target=new URL(base+(subpath.startsWith('/')?subpath:'/'+subpath));
  const headers=new Headers();for(const [k,v] of request.headers){if(['content-type','accept','if-none-match','if-modified-since'].includes(k.toLowerCase()))headers.set(k,v)}
  if(env.MODULE_ADAPTER_TOKEN)headers.set('authorization',`Bearer ${env.MODULE_ADAPTER_TOKEN}`);
  const init={method:request.method,headers,redirect:'manual'};if(!['GET','HEAD'].includes(request.method))init.body=await request.arrayBuffer();
  const r=await timedFetch(target.toString(),init,12000);const outHeaders=new Headers();outHeaders.set('content-type',r.headers.get('content-type')||'application/json');outHeaders.set('cache-control','no-store');return new Response(r.body,{status:r.status,headers:outHeaders});
}
