import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const digest=value=>crypto.createHash('sha256').update(String(value)).digest('hex')

export function createWorkerCredential({poolId,workerId,memberId,secret}={}){
  if(!poolId||!workerId||!memberId||!secret) throw new Error('WORKER_CREDENTIAL_FIELDS_REQUIRED')
  if(String(secret).length<16) throw new Error('WORKER_SECRET_TOO_SHORT')
  const salt=crypto.randomBytes(16).toString('hex')
  const secretHash=digest(`${salt}:${secret}`)
  return Object.freeze({credentialId:`cred_${crypto.randomUUID()}`,poolId,workerId,memberId,salt,secretHash,state:'ACTIVE',createdAt:now()})
}

export function authenticateWorker(credential,{poolId,workerId,secret}={}){
  if(!credential||credential.state!=='ACTIVE') return false
  if(credential.poolId!==poolId||credential.workerId!==workerId||!secret) return false
  const computed=digest(`${credential.salt}:${secret}`)
  const a=Buffer.from(computed,'hex'),b=Buffer.from(credential.secretHash,'hex')
  return a.length===b.length&&crypto.timingSafeEqual(a,b)
}
