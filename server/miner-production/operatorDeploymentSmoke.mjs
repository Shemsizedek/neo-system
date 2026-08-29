const base=String(process.env.NEO_OPERATOR_PUBLIC_URL||'').replace(/\/$/,'')
const origin=String(process.env.NEO_OPERATOR_ORIGIN||'')
const operatorId=String(process.env.NEO_SMOKE_OPERATOR_ID||'')
const password=String(process.env.NEO_SMOKE_OPERATOR_PASSWORD||'')
if(!base||!origin)throw new Error('NEO_OPERATOR_PUBLIC_URL_AND_ORIGIN_REQUIRED')
if(!base.startsWith('https://')||!origin.startsWith('https://'))throw new Error('HTTPS_REQUIRED')

async function request(path,{method='GET',body,cookie,csrf}={}){
  const headers={origin}
  if(body!==undefined)headers['content-type']='application/json'
  if(cookie)headers.cookie=cookie
  if(csrf)headers['x-csrf-token']=csrf
  const r=await fetch(`${base}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error'})
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
  return {r,data}
}

const health=await request('/health')
if(!health.r.ok)throw new Error(`HEALTH_${health.r.status}`)
if(health.r.headers.get('access-control-allow-origin')!==origin)throw new Error('CORS_ORIGIN_MISMATCH')
const ready=await request('/ready')
if(!ready.r.ok||ready.data.ready!==true)throw new Error(`READY_BLOCKED_${ready.r.status}`)
const anonymous=await request('/session')
if(anonymous.r.status!==401)throw new Error('ANONYMOUS_SESSION_MUST_BE_401')

let authenticated=false,role=null
if(operatorId&&password){
  const login=await request('/session/login',{method:'POST',body:{operatorId,password}})
  if(!login.r.ok)throw new Error(`LOGIN_${login.r.status}`)
  const setCookie=login.r.headers.get('set-cookie')||''
  if(!/HttpOnly/i.test(setCookie)||!/Secure/i.test(setCookie)||!/SameSite=(Lax|Strict)/i.test(setCookie))throw new Error('SESSION_COOKIE_POLICY_INVALID')
  const cookie=setCookie.split(';')[0]
  const csrf=String(login.data.csrfToken||'')
  if(!cookie||!csrf)throw new Error('SESSION_MATERIAL_MISSING')
  const treasury=await request('/treasury',{cookie})
  if(!treasury.r.ok)throw new Error(`TREASURY_${treasury.r.status}`)
  const audit=await request('/audit',{cookie})
  if(![200,403].includes(audit.r.status))throw new Error(`AUDIT_${audit.r.status}`)
  const logout=await request('/session/logout',{method:'POST',cookie,csrf})
  if(!logout.r.ok)throw new Error(`LOGOUT_${logout.r.status}`)
  authenticated=true;role=login.data?.operator?.role||null
}
console.log(JSON.stringify({ok:true,health:true,ready:true,anonymousBlocked:true,authenticated,role},null,2))
