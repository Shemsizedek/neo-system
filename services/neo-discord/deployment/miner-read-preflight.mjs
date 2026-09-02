const required=['NEO_MINER_OPERATOR_URL','NEO_MINER_OPERATOR_TOKEN']
const selectorFields=['DISCORD_OPERATOR_USER_IDS','DISCORD_OPERATOR_ROLE_IDS']
const snowflake=/^\d{15,22}$/
const tokenPattern=/^[a-f0-9]{64}$/i

function csv(value){return String(value||'').split(',').map(x=>x.trim()).filter(Boolean)}

export function evaluateMinerReadEnv(env=process.env){
  const values=Object.fromEntries(required.map(name=>[name,String(env[name]||'').trim()]))
  const missing=required.filter(name=>!values[name])
  if(missing.length)return {ok:false,code:'MISSING_REQUIRED_RUNTIME_VALUES',missing}

  let url
  try{url=new URL(values.NEO_MINER_OPERATOR_URL)}catch{return {ok:false,code:'NEO_MINER_OPERATOR_URL_INVALID_URL',missing:[]}}
  if(url.protocol!=='https:')return {ok:false,code:'NEO_MINER_OPERATOR_URL_HTTPS_REQUIRED',missing:[]}
  if(url.username||url.password)return {ok:false,code:'NEO_MINER_OPERATOR_URL_CREDENTIALS_IN_URL_FORBIDDEN',missing:[]}
  if(url.hostname==='shemsizedek.github.io')return {ok:false,code:'NEO_MINER_OPERATOR_URL_PAGES_RUNTIME_FORBIDDEN',missing:[]}
  if(url.hostname==='neo-discord-api.neosystem.workers.dev')return {ok:false,code:'NEO_MINER_OPERATOR_URL_DISCORD_BRIDGE_RECURSION_FORBIDDEN',missing:[]}
  if(url.pathname!=='/discord/snapshot')return {ok:false,code:'NEO_MINER_OPERATOR_URL_MACHINE_READ_PATH_REQUIRED',missing:[]}
  if(!tokenPattern.test(values.NEO_MINER_OPERATOR_TOKEN))return {ok:false,code:'NEO_MINER_OPERATOR_TOKEN_64_HEX_REQUIRED',missing:[]}

  const selectors=selectorFields.flatMap(name=>csv(env[name]).map(value=>({name,value})))
  if(!selectors.length)return {ok:false,code:'OPERATOR_SELECTOR_REQUIRED',missing:selectorFields}
  const invalid=selectors.filter(x=>!snowflake.test(x.value))
  if(invalid.length)return {ok:false,code:'INVALID_DISCORD_OPERATOR_SELECTOR',missing:[],invalidFields:[...new Set(invalid.map(x=>x.name))]}

  return {
    ok:true,
    code:'READY',
    configuredServices:['neo-miner'],
    disabledServices:['neo-relations'],
    selectorModes:selectorFields.filter(name=>csv(env[name]).length).map(name=>name==='DISCORD_OPERATOR_USER_IDS'?'user':'role')
  }
}

if(import.meta.url===`file://${process.argv[1]}`){
  const result=evaluateMinerReadEnv(process.env)
  console.log(JSON.stringify(result))
  if(!result.ok)process.exit(1)
}
