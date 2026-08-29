import crypto from 'node:crypto'

const nowMs=()=>Date.now()
const b64url=value=>Buffer.from(value).toString('base64url')
const parseB64=value=>Buffer.from(value,'base64url').toString('utf8')
const timingSafe=(a,b)=>{const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}

export const OPERATOR_ROLES={VIEWER:'VIEWER',OPERATIONS:'OPERATIONS',TREASURY:'TREASURY',ADMIN:'ADMIN'}
export const PERMISSIONS={
  VIEW_OPERATIONS:'VIEW_OPERATIONS',
  VIEW_AUDIT:'VIEW_AUDIT',
  MANAGE_INCIDENTS:'MANAGE_INCIDENTS',
  MANAGE_TREASURY:'MANAGE_TREASURY',
  MANAGE_FLEET:'MANAGE_FLEET',
  MANAGE_HASHVAULT:'MANAGE_HASHVAULT',
  MANAGE_PAYOUTS:'MANAGE_PAYOUTS'
}
const ROLE_PERMISSIONS={
  VIEWER:new Set([PERMISSIONS.VIEW_OPERATIONS]),
  OPERATIONS:new Set([PERMISSIONS.VIEW_OPERATIONS,PERMISSIONS.VIEW_AUDIT,PERMISSIONS.MANAGE_FLEET]),
  TREASURY:new Set([PERMISSIONS.VIEW_OPERATIONS,PERMISSIONS.VIEW_AUDIT,PERMISSIONS.MANAGE_INCIDENTS,PERMISSIONS.MANAGE_TREASURY,PERMISSIONS.MANAGE_HASHVAULT,PERMISSIONS.MANAGE_PAYOUTS]),
  ADMIN:new Set(Object.values(PERMISSIONS))
}

export function hashOperatorPassword(password,salt=crypto.randomBytes(16).toString('hex')){
  if(typeof password!=='string'||password.length<12) throw new Error('OPERATOR_PASSWORD_TOO_SHORT')
  const digest=crypto.scryptSync(password,salt,64).toString('hex')
  return `scrypt$${salt}$${digest}`
}
export function verifyOperatorPassword(password,encoded){
  try{const [kind,salt,digest]=String(encoded||'').split('$');if(kind!=='scrypt'||!salt||!digest)return false;const candidate=crypto.scryptSync(String(password||''),salt,64).toString('hex');return timingSafe(candidate,digest)}catch{return false}
}
export function parseOperatorAccounts(raw=process.env.NEO_OPERATOR_ACCOUNTS_JSON||'[]'){
  let rows=[];try{rows=JSON.parse(raw)}catch{throw new Error('OPERATOR_ACCOUNTS_JSON_INVALID')}
  if(!Array.isArray(rows)) throw new Error('OPERATOR_ACCOUNTS_JSON_INVALID')
  return rows.map(row=>{const id=String(row.id||'').trim(),role=String(row.role||'').toUpperCase(),passwordHash=String(row.passwordHash||'');if(!id||!ROLE_PERMISSIONS[role]||!passwordHash)throw new Error('OPERATOR_ACCOUNT_INVALID');return {id,role,passwordHash,displayName:String(row.displayName||id)}})
}

export function createOperatorAuth({secret=process.env.NEO_OPERATOR_SESSION_SECRET,accounts=parseOperatorAccounts(),ttlSeconds=Number(process.env.NEO_OPERATOR_SESSION_TTL_SEC||1800),cookieName='neo_operator_session',secure=true,sameSite=process.env.NEO_OPERATOR_COOKIE_SAMESITE||'Lax'}={}){
  if(!secret||String(secret).length<32) throw new Error('OPERATOR_SESSION_SECRET_REQUIRED')
  if(!['Strict','Lax','None'].includes(String(sameSite)))throw new Error('OPERATOR_SAMESITE_INVALID')
  if(String(sameSite)==='None'&&!secure)throw new Error('OPERATOR_SAMESITE_NONE_REQUIRES_SECURE')
  const accountById=new Map(accounts.map(v=>[v.id,v]))
  const sign=input=>crypto.createHmac('sha256',secret).update(input).digest('base64url')
  const issue=account=>{
    const session={sid:crypto.randomUUID(),sub:account.id,role:account.role,displayName:account.displayName,csrf:crypto.randomBytes(24).toString('base64url'),iat:nowMs(),exp:nowMs()+Math.max(300,ttlSeconds)*1000}
    const payload=b64url(JSON.stringify(session)),token=`${payload}.${sign(payload)}`
    const cookie=`${cookieName}=${token}; Path=/; HttpOnly; ${secure?'Secure; ':''}SameSite=${sameSite}; Max-Age=${Math.max(300,ttlSeconds)}`
    return {session,cookie,csrfToken:session.csrf}
  }
  const readCookie=req=>{const raw=String(req?.headers?.cookie||'');const entry=raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${cookieName}=`));return entry?entry.slice(cookieName.length+1):''}
  const verifyToken=token=>{
    const [payload,signature]=String(token||'').split('.');if(!payload||!signature||!timingSafe(sign(payload),signature))return null
    try{const session=JSON.parse(parseB64(payload));if(!session?.sub||!session?.role||Number(session.exp)<=nowMs())return null;if(!accountById.has(session.sub))return null;return session}catch{return null}
  }
  const authenticate=(id,password)=>{const account=accountById.get(String(id||''));return account&&verifyOperatorPassword(password,account.passwordHash)?account:null}
  const sessionFromRequest=req=>verifyToken(readCookie(req))
  const hasPermission=(session,permission)=>Boolean(session&&ROLE_PERMISSIONS[session.role]?.has(permission))
  const requirePermission=(req,permission,{csrf=false}={})=>{
    const session=sessionFromRequest(req);if(!session)return {ok:false,status:401,error:'OPERATOR_SESSION_REQUIRED'}
    if(!hasPermission(session,permission))return {ok:false,status:403,error:'OPERATOR_PERMISSION_DENIED'}
    if(csrf){const supplied=String(req.headers['x-csrf-token']||'');if(!supplied||!timingSafe(supplied,session.csrf))return {ok:false,status:403,error:'CSRF_VALIDATION_FAILED'}}
    return {ok:true,session}
  }
  const clearCookie=()=>`${cookieName}=; Path=/; HttpOnly; ${secure?'Secure; ':''}SameSite=${sameSite}; Max-Age=0`
  return {authenticate,issue,sessionFromRequest,hasPermission,requirePermission,clearCookie}
}
