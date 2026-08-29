const required=['NEO_MINER_OPERATOR_URL','NEO_MINER_OPERATOR_TOKEN','NEO_RELATIONS_OPERATOR_URL','NEO_RELATIONS_OPERATOR_TOKEN']
const selectorFields=['DISCORD_OPERATOR_USER_IDS','DISCORD_OPERATOR_ROLE_IDS']
const snowflake=/^\d{15,22}$/

function csv(value){return String(value||'').split(',').map(x=>x.trim()).filter(Boolean)}
function mustHttps(name,value){
  let url
  try{url=new URL(value)}catch{throw new Error(`${name}_INVALID_URL`)}
  if(url.protocol!=='https:')throw new Error(`${name}_HTTPS_REQUIRED`)
  if(url.username||url.password)throw new Error(`${name}_CREDENTIALS_IN_URL_FORBIDDEN`)
  if(url.hostname==='shemsizedek.github.io')throw new Error(`${name}_PAGES_RUNTIME_FORBIDDEN`)
  if(url.hostname==='neo-discord-api.neosystem.workers.dev')throw new Error(`${name}_DISCORD_BRIDGE_RECURSION_FORBIDDEN`)
  return url
}

export function evaluateOperatorReadEnv(env=process.env){
  const missing=required.filter(name=>!String(env[name]||'').trim())
  if(missing.length)return {ok:false,code:'MISSING_REQUIRED_RUNTIME_VALUES',missing}

  let minerUrl
  try{
    minerUrl=mustHttps('NEO_MINER_OPERATOR_URL',String(env.NEO_MINER_OPERATOR_URL).trim())
    mustHttps('NEO_RELATIONS_OPERATOR_URL',String(env.NEO_RELATIONS_OPERATOR_URL).trim())
  }catch(error){return {ok:false,code:error.message,missing:[]}}
  if(minerUrl.pathname!=='/discord/snapshot')return {ok:false,code:'NEO_MINER_OPERATOR_URL_MACHINE_READ_PATH_REQUIRED',missing:[]}

  const selectors=selectorFields.flatMap(name=>csv(env[name]).map(value=>({name,value})))
  if(!selectors.length)return {ok:false,code:'OPERATOR_SELECTOR_REQUIRED',missing:selectorFields}
  const invalid=selectors.filter(x=>!snowflake.test(x.value))
  if(invalid.length)return {ok:false,code:'INVALID_DISCORD_OPERATOR_SELECTOR',missing:[],invalidFields:[...new Set(invalid.map(x=>x.name))]}

  return {
    ok:true,
    code:'READY',
    configuredServices:['neo-miner','neo-relations'],
    selectorModes:selectorFields.filter(name=>csv(env[name]).length).map(name=>name==='DISCORD_OPERATOR_USER_IDS'?'user':'role')
  }
}

if(import.meta.url===`file://${process.argv[1]}`){
  const result=evaluateOperatorReadEnv(process.env)
  console.log(JSON.stringify(result))
  if(!result.ok)process.exit(1)
}
