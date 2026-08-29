import http from 'node:http'
import {createOperatorAuth,PERMISSIONS,parseOperatorAccounts} from './operatorAuth.mjs'
import {validateOperatorDeploymentPolicy} from './deploymentPolicy.mjs'
import {DISCORD_MACHINE_READ_PATH,bearerTokenMatches} from './discordMachineRead.mjs'

const PORT=Number(process.env.NEO_OPERATOR_PORT||8891)
const ORIGIN=process.env.NEO_OPERATOR_ORIGIN||process.env.CORS_ORIGIN||'https://shemsizedek.github.io'
const PUBLIC_URL=process.env.NEO_OPERATOR_PUBLIC_URL||''
const INTERNAL_API=(process.env.NEO_MINER_INTERNAL_API_URL||'http://127.0.0.1:8890').replace(/\/$/,'')
const INTERNAL_TOKEN=process.env.NEO_MINER_API_TOKEN||''
const DISCORD_READ_TOKEN=process.env.NEO_DISCORD_OPERATOR_READ_TOKEN||''
const loginAttempts=new Map()

const json=(res,status,body,extra={})=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':ORIGIN,'access-control-allow-credentials':'true','vary':'Origin','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...extra});res.end(JSON.stringify(body))}
const readBody=req=>new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>50_000)reject(new Error('body too large'))});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}});req.on('error',reject)})
const auth=createOperatorAuth({secret:process.env.NEO_OPERATOR_SESSION_SECRET,accounts:parseOperatorAccounts(),ttlSeconds:Number(process.env.NEO_OPERATOR_SESSION_TTL_SEC||1800),secure:process.env.NEO_OPERATOR_COOKIE_SECURE!=='false',sameSite:process.env.NEO_OPERATOR_COOKIE_SAMESITE||'Lax'})
const clientKey=req=>String(req.headers['cf-connecting-ip']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim()
const throttle=req=>{const key=clientKey(req),now=Date.now(),windowMs=10*60*1000;let row=loginAttempts.get(key)||{count:0,start:now};if(now-row.start>windowMs)row={count:0,start:now};row.count++;loginAttempts.set(key,row);return row.count>10}
const originAllowed=req=>!req.headers.origin||String(req.headers.origin)===ORIGIN
const permissionFor=(method,path)=>{
  if(method==='GET'&&['/treasury','/snapshot'].includes(path))return PERMISSIONS.VIEW_OPERATIONS
  if(method==='GET'&&path==='/audit')return PERMISSIONS.VIEW_AUDIT
  if(method==='GET'&&path==='/fleet')return PERMISSIONS.VIEW_OPERATIONS
  if(method==='GET'&&path==='/hashvault')return PERMISSIONS.VIEW_OPERATIONS
  if(method==='GET'&&['/incidents','/runtime-drift'].includes(path))return PERMISSIONS.VIEW_AUDIT
  if(method==='POST'&&/^\/incidents\/[^/]+\/(acknowledge|resolve)$/.test(path))return PERMISSIONS.MANAGE_INCIDENTS
  if(method==='POST'&&/^\/payouts\//.test(path))return PERMISSIONS.MANAGE_PAYOUTS
  if(method==='POST'&&/^\/hashvault\//.test(path))return PERMISSIONS.MANAGE_HASHVAULT
  if(method==='POST'&&/^\/fleet\//.test(path))return PERMISSIONS.MANAGE_FLEET
  return null
}
const internalHealth=async()=>{
  if(!INTERNAL_TOKEN)return {ok:false,error:'INTERNAL_API_TOKEN_NOT_CONFIGURED'}
  try{const r=await fetch(`${INTERNAL_API}/health`,{headers:{authorization:`Bearer ${INTERNAL_TOKEN}`}});return {ok:r.ok,status:r.status}}catch(error){return {ok:false,error:String(error?.message||error)}}
}
const proxy=async(req,res,session)=>{
  const body=['POST','PUT','PATCH'].includes(req.method||'')?await readBody(req):null
  const headers={'authorization':`Bearer ${INTERNAL_TOKEN}`,'content-type':'application/json','x-neo-operator-id':session.sub,'x-neo-operator-role':session.role}
  if(req.headers['idempotency-key'])headers['idempotency-key']=String(req.headers['idempotency-key'])
  const payload=body===null?undefined:JSON.stringify({...body,operatorId:session.sub})
  const upstream=await fetch(`${INTERNAL_API}${req.url}`,{method:req.method,headers,body:payload})
  const text=await upstream.text();let result;try{result=text?JSON.parse(text):{}}catch{result={error:'UPSTREAM_RESPONSE_INVALID'}}
  return json(res,upstream.status,result)
}
const proxyDiscordSnapshot=async(res)=>{
  const upstream=await fetch(`${INTERNAL_API}/snapshot`,{method:'GET',headers:{authorization:`Bearer ${INTERNAL_TOKEN}`,'x-neo-operator-id':'discord-service','x-neo-operator-role':'VIEWER'}})
  const text=await upstream.text();let result;try{result=text?JSON.parse(text):{}}catch{result={error:'UPSTREAM_RESPONSE_INVALID'}}
  return json(res,upstream.status,result)
}

export const operatorServer=http.createServer(async(req,res)=>{
  if(req.url===DISCORD_MACHINE_READ_PATH){
    if(req.method!=='GET')return json(res,405,{error:'METHOD_NOT_ALLOWED'},{allow:'GET'})
    if(!DISCORD_READ_TOKEN)return json(res,503,{error:'DISCORD_MACHINE_READ_NOT_CONFIGURED'})
    if(!bearerTokenMatches(req.headers.authorization,DISCORD_READ_TOKEN))return json(res,401,{error:'DISCORD_MACHINE_READ_UNAUTHORIZED'})
    if(!INTERNAL_TOKEN)return json(res,503,{error:'INTERNAL_API_TOKEN_NOT_CONFIGURED'})
    try{return await proxyDiscordSnapshot(res)}catch(error){return json(res,502,{error:'OPERATOR_UPSTREAM_UNAVAILABLE',detail:String(error?.message||error)})}
  }
  if(!originAllowed(req))return json(res,403,{error:'OPERATOR_ORIGIN_DENIED'})
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':ORIGIN,'access-control-allow-credentials':'true','access-control-allow-headers':'content-type,x-csrf-token,idempotency-key','access-control-allow-methods':'GET,POST,OPTIONS','vary':'Origin'});return res.end()}
  if(req.method==='GET'&&req.url==='/health')return json(res,200,{service:'neo-miner-operator-control-plane',status:'UP',auth:'SESSION_RBAC',sameSite:process.env.NEO_OPERATOR_COOKIE_SAMESITE||'Lax',discordMachineRead:Boolean(DISCORD_READ_TOKEN)})
  if(req.method==='GET'&&req.url==='/ready'){const upstream=await internalHealth();return json(res,upstream.ok?200:503,{service:'neo-miner-operator-control-plane',ready:upstream.ok,internalApi:upstream.ok?'READY':'BLOCKED'})}
  if(req.method==='POST'&&req.url==='/session/login'){
    if(!req.headers.origin)return json(res,403,{error:'OPERATOR_BROWSER_ORIGIN_REQUIRED'})
    if(throttle(req))return json(res,429,{error:'LOGIN_RATE_LIMITED'})
    try{const body=await readBody(req);const account=auth.authenticate(body.operatorId,body.password);if(!account)return json(res,401,{error:'INVALID_OPERATOR_CREDENTIALS'});const issued=auth.issue(account);return json(res,200,{operator:{id:account.id,displayName:account.displayName,role:account.role},csrfToken:issued.csrfToken,expiresAt:issued.session.exp},{'set-cookie':issued.cookie})}catch(error){return json(res,400,{error:error.message})}
  }
  if(req.method==='GET'&&req.url==='/session'){
    const session=auth.sessionFromRequest(req);if(!session)return json(res,401,{error:'OPERATOR_SESSION_REQUIRED'});return json(res,200,{operator:{id:session.sub,displayName:session.displayName,role:session.role},csrfToken:session.csrf,expiresAt:session.exp})
  }
  if(req.method==='POST'&&req.url==='/session/logout'){
    const session=auth.sessionFromRequest(req);if(session){const check=auth.requirePermission(req,PERMISSIONS.VIEW_OPERATIONS,{csrf:true});if(!check.ok)return json(res,check.status,{error:check.error})}
    return json(res,200,{ok:true},{'set-cookie':auth.clearCookie()})
  }
  const permission=permissionFor(req.method||'GET',req.url||'/');if(!permission)return json(res,404,{error:'not_found'})
  const mutation=req.method!=='GET';const check=auth.requirePermission(req,permission,{csrf:mutation});if(!check.ok)return json(res,check.status,{error:check.error})
  if(!INTERNAL_TOKEN)return json(res,503,{error:'INTERNAL_API_TOKEN_NOT_CONFIGURED'})
  try{return await proxy(req,res,check.session)}catch(error){return json(res,502,{error:'OPERATOR_UPSTREAM_UNAVAILABLE',detail:String(error?.message||error)})}
})

export function startOperatorControlPlane(){
  const deployment=validateOperatorDeploymentPolicy({consoleOrigin:ORIGIN,operatorPublicUrl:PUBLIC_URL,siteSuffix:process.env.NEO_OPERATOR_SITE_SUFFIX,sameSite:process.env.NEO_OPERATOR_COOKIE_SAMESITE||'Lax',secure:process.env.NEO_OPERATOR_COOKIE_SECURE!=='false',requireSameSite:process.env.NEO_OPERATOR_REQUIRE_SAME_SITE!=='false'})
  if(!INTERNAL_TOKEN)throw new Error('INTERNAL_API_TOKEN_NOT_CONFIGURED')
  return operatorServer.listen(PORT,'0.0.0.0',()=>console.log(`NEO Miner operator control plane listening on ${PORT} for ${deployment.consoleOrigin}`))
}

if(import.meta.url===`file://${process.argv[1]}`){try{startOperatorControlPlane()}catch(error){console.error('NEO Miner operator control plane blocked:',error.message);process.exitCode=1}}
