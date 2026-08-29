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

export function serviceRegistry(){return SERVICES.map(x=>({...x}))}
export function findService(id){const key=String(id||'').trim().toLowerCase();return SERVICES.find(x=>x.id===key)||null}
function option(interaction,name){return interaction?.data?.options?.find(x=>x.name===name)?.value}

export function formatService(service){
  if(!service)return 'Unknown NEO Service.'
  const pages=service.pagesPath?`GitHub Pages: https://shemsizedek.github.io/neo-system${service.pagesPath}`:'GitHub Pages: not publicly published'
  const command=service.specializedCommand?`Specialized Discord command: /${service.specializedCommand}`:'Specialized Discord command: none; use /services for discovery'
  return [`**${service.name}** (${service.id})`,`Backend: GitHub → ${service.githubPath}`,pages,'Server/API plane: Discord',command,'Sensitive execution: disabled by default'].join('\n')
}

export async function handleServicesCommand(interaction){
  const requested=option(interaction,'service')
  if(requested)return formatService(findService(requested))
  const publicServices=SERVICES.filter(x=>x.visibility==='public')
  const internal=SERVICES.filter(x=>x.visibility!=='public')
  return [
    '**NEO Services — Discord API Namespace**',
    `Registered: ${SERVICES.length} (${publicServices.length} public, ${internal.length} internal)`,
    'Planes: GitHub backend · GitHub Pages frontend · Discord server/API',
    '',
    publicServices.map(x=>`• ${x.id}${x.specializedCommand?` → /${x.specializedCommand}`:''}`).join('\n'),
    '',
    'Use `/services service:<id>` for service details.'
  ].join('\n').slice(0,1900)
}
