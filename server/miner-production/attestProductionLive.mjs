import {writeFile} from 'node:fs/promises'
import {attestationCheck,buildProductionAttestation,assertGreenAttestation} from './productionAttestation.mjs'

const base=String(process.env.NEO_OPERATOR_PUBLIC_URL||'').replace(/\/$/,'')
const origin=String(process.env.NEO_OPERATOR_ORIGIN||'')
const operatorId=String(process.env.NEO_ATTEST_OPERATOR_ID||process.env.NEO_SMOKE_OPERATOR_ID||'')
const password=String(process.env.NEO_ATTEST_OPERATOR_PASSWORD||process.env.NEO_SMOKE_OPERATOR_PASSWORD||'')
const output=String(process.env.NEO_ATTESTATION_OUTPUT||'production-attestation.json')
if(!base||!origin||!operatorId||!password)throw new Error('PRODUCTION_ATTESTATION_CONFIGURATION_REQUIRED')
if(!base.startsWith('https://')||!origin.startsWith('https://'))throw new Error('PRODUCTION_ATTESTATION_HTTPS_REQUIRED')

async function request(path,{method='GET',body,cookie,csrf}={}){
  const headers={origin}
  if(body!==undefined)headers['content-type']='application/json'
  if(cookie)headers.cookie=cookie
  if(csrf)headers['x-csrf-token']=csrf
  try{
    const r=await fetch(`${base}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error'})
    const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={}}
    return {status:r.status,ok:r.ok,headers:r.headers,data}
  }catch(error){return {status:0,ok:false,headers:new Headers(),data:{},error:String(error?.message||error)}}
}

const checks=[]
checks.push(attestationCheck('EDGE_HTTPS',base.startsWith('https://')&&origin.startsWith('https://'),{operatorHost:new URL(base).hostname,consoleHost:new URL(origin).hostname}))

const health=await request('/health')
checks.push(attestationCheck('OPERATOR_HEALTH',health.ok&&health.data?.status==='UP',{status:health.status,service:health.data?.service||null}))

const ready=await request('/ready')
checks.push(attestationCheck('PRIVATE_BACKEND_READY',ready.ok&&ready.data?.ready===true&&ready.data?.internalApi==='READY',{status:ready.status,internalApi:ready.data?.internalApi||null}))

const anonymous=await request('/session')
checks.push(attestationCheck('ANONYMOUS_SESSION_BLOCKED',anonymous.status===401,{status:anonymous.status}))

const login=await request('/session/login',{method:'POST',body:{operatorId,password}})
const setCookie=login.headers.get('set-cookie')||''
const cookie=setCookie.split(';')[0]
const csrf=String(login.data?.csrfToken||'')
const role=login.data?.operator?.role||null
checks.push(attestationCheck('AUTHENTICATED_SESSION',login.ok&&Boolean(cookie)&&Boolean(csrf)&&Boolean(role),{status:login.status,role}))
checks.push(attestationCheck('SESSION_COOKIE_POLICY',/HttpOnly/i.test(setCookie)&&/Secure/i.test(setCookie)&&/SameSite=(Lax|Strict)/i.test(setCookie),{httpOnly:/HttpOnly/i.test(setCookie),secure:/Secure/i.test(setCookie),sameSite:/SameSite=(Lax|Strict)/i.test(setCookie)}))

if(login.ok&&cookie&&csrf){
  const session=await request('/session',{cookie})
  const sessionOk=session.ok&&session.data?.operator?.id===operatorId&&session.data?.operator?.role===role
  checks.push(attestationCheck('RBAC_PROVEN',sessionOk&&['VIEWER','OPERATIONS','TREASURY','ADMIN'].includes(role),{status:session.status,role}))

  const treasury=await request('/treasury',{cookie})
  checks.push(attestationCheck('TREASURY_READ',treasury.ok,{status:treasury.status}))

  const hashvault=await request('/hashvault',{cookie})
  checks.push(attestationCheck('HASHVAULT_READ',hashvault.ok,{status:hashvault.status}))

  const csrfProbe=await request('/session/logout',{method:'POST',cookie})
  checks.push(attestationCheck('CSRF_ENFORCED',csrfProbe.status===403&&csrfProbe.data?.error==='CSRF_VALIDATION_FAILED',{status:csrfProbe.status,error:csrfProbe.data?.error||null}))

  const logout=await request('/session/logout',{method:'POST',cookie,csrf})
  checks.push(attestationCheck('SESSION_LOGOUT',logout.ok,{status:logout.status}))
}else{
  for(const id of ['RBAC_PROVEN','TREASURY_READ','HASHVAULT_READ','CSRF_ENFORCED','SESSION_LOGOUT'])checks.push(attestationCheck(id,false,{reason:'LOGIN_NOT_ESTABLISHED'}))
}

const attestation=buildProductionAttestation({checks,operatorId,operatorRole:role})
await writeFile(output,`${JSON.stringify(attestation,null,2)}\n`,{mode:0o600})
console.log(JSON.stringify({schema:attestation.schema,state:attestation.state,summary:attestation.summary,operatorRole:role,output},null,2))
assertGreenAttestation(attestation)
