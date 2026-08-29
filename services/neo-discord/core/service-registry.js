const SERVICES=[
  ['gisd','GISD / NEO Cipher','apps/gisd',null,null,'internal'],
  ['neo-counter','NEO Counter','apps/neo-counter','/neo-counter/',null,'public'],
  ['neo-exchange','NEO Exchange','apps/neo-exchange','/neo-exchange/',null,'public'],
  ['neo-guardian','NEO Guardian','apps/neo-guardian','/guardian/',null,'public'],
  ['neo-prime','NEO Prime','apps/neo-prime','/neo-prime/','neo','public'],
  ['neo-relations','NEO Relations','apps/neo-relations','/neo-relations/','relations','public'],
  ['neo-telegram','Neogram / NEO Telegram','apps/neo-telegram','/neogram/',null,'public'],
  ['neo-tv','NEO TV','apps/neo-tv','/neo-tv/',null,'public'],
  ['neopay','NEOpay','apps/neopay','/neopay/',null,'public'],
  ['neoscan','NEOscan','apps/neoscan','/neoscan/',null,'public'],
  ['noogle','Noogle','apps/noogle','/noogle/',null,'public'],
  ['omnitrix-android','Omnitrix Android','apps/omnitrix-android',null,null,'internal'],
  ['omnitrix','Omnitrix','apps/omnitrix','/omnitrix/',null,'public'],
  ['neo-pacer','NEO-PACER','docs/neo-pacer','/neo-pacer/',null,'public'],
  ['neo-enterprise','NEO Enterprise','docs/neo-enterprise','/neo-enterprise/',null,'public'],
  ['neo-hub','NEO Hub','docs/neo-hub','/neo-hub/',null,'public'],
  ['neo-oracle','NEO Oracle','docs/neo-oracle','/neo-oracle/',null,'public'],
  ['neo-lingo','NEO Lingo','docs/neo-lingo','/neo-lingo/',null,'public'],
  ['neo-algo','NEO Algo','docs/neo-algo','/neo-algo/',null,'public'],
  ['neo-corpus','NEO Corpus','docs/neo-corpus','/neo-corpus/',null,'public']
].map(([id,name,githubPath,pagesPath,specializedCommand,visibility])=>({id,name,githubPath,pagesPath,specializedCommand,visibility}))

const REPO='Shemsizedek/neo-system'
const PAGES_ROOT='https://shemsizedek.github.io/neo-system'
const READ_ADAPTERS=new Set(['neopay','neoscan','neo-exchange','neo-counter','neo-relations'])

export function serviceRegistry(){return SERVICES.map(x=>({...x}))}
export function findService(id){const key=String(id||'').trim().toLowerCase();return SERVICES.find(x=>x.id===key)||null}
function option(interaction,name){return interaction?.data?.options?.find(x=>x.name===name)?.value}
function githubHeaders(env={}){const h={accept:'application/vnd.github+json','user-agent':'neo-discord-services'};if(env.GITHUB_API_TOKEN)h.authorization=`Bearer ${env.GITHUB_API_TOKEN}`;return h}
function githubContentsUrl(path){return `https://api.github.com/repos/${REPO}/contents/${String(path).split('/').map(encodeURIComponent).join('/')}?ref=main`}
async function jsonRead(url,{fetchImpl=fetch,headers={}}={}){try{const r=await fetchImpl(url,{headers:{accept:'application/json',...headers},redirect:'follow',signal:AbortSignal.timeout(10000)});if(!r.ok)return{ok:false,status:r.status,data:null};return{ok:true,status:r.status,data:await r.json().catch(()=>null)}}catch{return{ok:false,status:0,data:null}}}
function scalar(data,key){const v=data?.[key];return ['string','number','boolean'].includes(typeof v)?String(v):null}
function firstScalar(data,keys){for(const key of keys){const v=scalar(data,key);if(v!==null)return `${key}=${v}`}return null}

export function formatService(service){
  if(!service)return 'Unknown NEO Service.'
  const pages=service.pagesPath?`GitHub Pages: ${PAGES_ROOT}${service.pagesPath}`:'GitHub Pages: not publicly published'
  const command=service.specializedCommand?`Specialized Discord command: /${service.specializedCommand}`:'Specialized Discord command: none; use /services for discovery'
  const adapter=READ_ADAPTERS.has(service.id)?'Service read adapter: available (`action:read`)':'Service read adapter: not yet defined'
  return [`**${service.name}** (${service.id})`,`Backend: GitHub → ${service.githubPath}`,pages,'Server/API plane: Discord',command,adapter,'Sensitive execution: disabled by default'].join('\n')
}

export async function serviceStatus(service,env={}, {fetchImpl=fetch}={}){
  if(!service)return 'Unknown NEO Service.'
  const backendUrl=githubContentsUrl(service.githubPath)
  let backend='UNREACHABLE',backendDetail=''
  try{
    const r=await fetchImpl(backendUrl,{headers:githubHeaders(env),signal:AbortSignal.timeout(10000)})
    if(r.ok){const body=await r.json().catch(()=>({}));backend='AVAILABLE';backendDetail=body?.type?` (${body.type})`:''}
    else backend=`HTTP ${r.status}`
  }catch{backend='UNREACHABLE'}

  let frontend='NOT PUBLISHED'
  if(service.pagesPath){
    try{
      const r=await fetchImpl(`${PAGES_ROOT}${service.pagesPath}`,{method:'GET',headers:{accept:'text/html'},redirect:'follow',signal:AbortSignal.timeout(10000)})
      frontend=r.ok?'AVAILABLE':`HTTP ${r.status}`
    }catch{frontend='UNREACHABLE'}
  }

  return [
    `**${service.name} — Control-Plane Status**`,
    `GitHub backend: ${backend}${backendDetail}`,
    `GitHub path: ${service.githubPath}`,
    `GitHub Pages frontend: ${frontend}`,
    service.pagesPath?`Pages route: ${PAGES_ROOT}${service.pagesPath}`:'Pages route: none',
    'Discord server/API: ACTIVE (read-only status surface)',
    'Status scope: repository path + published frontend reachability only',
    'Mutations / approvals / sensitive execution: disabled'
  ].join('\n').slice(0,1900)
}

async function readNeopay(fetchImpl){
  const [config,state]=await Promise.all([
    jsonRead(`${PAGES_ROOT}/api/router/providers.json`,{fetchImpl}),
    jsonRead(`${PAGES_ROOT}/api/router/state.json`,{fetchImpl})
  ])
  const providers=Array.isArray(config.data?.providers)?config.data.providers:[]
  const states=state.data?.providers&&typeof state.data.providers==='object'?Object.values(state.data.providers):[]
  const healthy=states.filter(x=>x?.healthy===true).length,unhealthy=states.filter(x=>x?.healthy===false).length
  return [`Provider snapshot: ${config.ok?'AVAILABLE':`HTTP ${config.status||'ERR'}`}`,`Configured providers: ${providers.length}`,`Health observations: ${healthy} healthy · ${unhealthy} unhealthy · ${Math.max(0,states.length-healthy-unhealthy)} unknown`]
}

async function readNeoscan(fetchImpl){
  const r=await jsonRead(`${PAGES_ROOT}/api/neoscan/statements/index.json`,{fetchImpl})
  const d=r.data||{}
  const collection=['accounts','statements','items','entries'].find(k=>Array.isArray(d[k]))
  const stamp=firstScalar(d,['generated_at','generatedAt','updated_at','updatedAt','as_of'])
  return [`Statement index: ${r.ok?'AVAILABLE':`HTTP ${r.status||'ERR'}`}`,collection?`${collection}: ${d[collection].length}`:'Published collection count: not declared',stamp?`Snapshot: ${stamp}`:'Snapshot timestamp: not declared']
}

async function readNeoCounter(fetchImpl){
  const [runtime,build]=await Promise.all([
    jsonRead(`${PAGES_ROOT}/api/neo-counter/runtime.json`,{fetchImpl}),
    jsonRead(`${PAGES_ROOT}/api/neo-counter/build.json`,{fetchImpl})
  ])
  const runtimeSignal=firstScalar(runtime.data,['status','mode','source','version'])
  const buildSignal=firstScalar(build.data,['commit','sha','generated_at','generatedAt'])
  return [`Runtime snapshot: ${runtime.ok?'AVAILABLE':`HTTP ${runtime.status||'ERR'}`}`,runtimeSignal?`Runtime: ${runtimeSignal}`:'Runtime scalar status: not declared',`Build snapshot: ${build.ok?'AVAILABLE':`HTTP ${build.status||'ERR'}`}`,buildSignal?`Build: ${buildSignal}`:'Build identity: not declared']
}

async function readNeoExchange(fetchImpl){
  const r=await jsonRead(`${PAGES_ROOT}/api/platforms/neo-exchange.json`,{fetchImpl})
  const signal=firstScalar(r.data,['status','mode','source','version','route'])
  return [`Platform snapshot: ${r.ok?'AVAILABLE':`HTTP ${r.status||'ERR'}`}`,signal?`Declared state: ${signal}`:'Declared scalar state: not present','Market-feed health: not inferred unless explicitly present in the published snapshot']
}

async function readNeoRelations(env,fetchImpl){
  const r=await jsonRead(githubContentsUrl('apps/neo-relations/runtime'),{fetchImpl,headers:githubHeaders(env)})
  const files=Array.isArray(r.data)?r.data.filter(x=>x?.type==='file').length:0
  return [`Protected runtime source: ${r.ok?'AVAILABLE IN GITHUB':`HTTP ${r.status||'ERR'}`}`,`Runtime files visible in source tree: ${files}`,'Queue / approval counts: not published to the public read plane','Use /relations for authorized relationship operations; this adapter performs no protected-data reads']
}

export async function serviceRead(service,env={}, {fetchImpl=fetch}={}){
  if(!service)return 'Unknown NEO Service.'
  if(!READ_ADAPTERS.has(service.id))return `**${service.name} — Service Read Adapter**\nNo specialized read adapter is registered yet. Use action:details or action:status.\nMutations / approvals / sensitive execution: disabled.`
  let lines=[]
  if(service.id==='neopay')lines=await readNeopay(fetchImpl)
  else if(service.id==='neoscan')lines=await readNeoscan(fetchImpl)
  else if(service.id==='neo-counter')lines=await readNeoCounter(fetchImpl)
  else if(service.id==='neo-exchange')lines=await readNeoExchange(fetchImpl)
  else if(service.id==='neo-relations')lines=await readNeoRelations(env,fetchImpl)
  return [`**${service.name} — Grounded Read Adapter**`,...lines,'Read-only: yes','Mutations / approvals / signing / transaction execution: disabled'].join('\n').slice(0,1900)
}

export async function handleServicesCommand(interaction,env={}, {fetchImpl=fetch}={}){
  const requested=option(interaction,'service')
  const action=String(option(interaction,'action')||'details').toLowerCase()
  if(requested){
    const service=findService(requested)
    if(action==='status')return serviceStatus(service,env,{fetchImpl})
    if(action==='read')return serviceRead(service,env,{fetchImpl})
    return formatService(service)
  }
  const publicServices=SERVICES.filter(x=>x.visibility==='public')
  const internal=SERVICES.filter(x=>x.visibility!=='public')
  return [
    '**NEO Services — Discord API Namespace**',
    `Registered: ${SERVICES.length} (${publicServices.length} public, ${internal.length} internal)`,
    'Planes: GitHub backend · GitHub Pages frontend · Discord server/API',
    '',
    publicServices.map(x=>`• ${x.id}${x.specializedCommand?` → /${x.specializedCommand}`:''}${READ_ADAPTERS.has(x.id)?' · read adapter':''}`).join('\n'),
    '',
    'Use `/services service:<id> action:details|status|read`.'
  ].join('\n').slice(0,1900)
}
