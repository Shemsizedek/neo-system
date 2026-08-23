import {createCipheriv,createDecipheriv,createHash,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto'

const token = () => randomBytes(32).toString('base64url')
export const sha256 = value => createHash('sha256').update(value).digest('hex')

export function hashPassword(password, salt=randomBytes(16).toString('hex')){
  if(typeof password!=='string' || password.length<10) throw new Error('Password must be at least 10 characters.')
  const derived=scryptSync(password,salt,64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password, stored){
  const [salt,expectedHex]=String(stored||'').split(':')
  if(!salt||!expectedHex) return false
  const actual=scryptSync(password,salt,64)
  const expected=Buffer.from(expectedHex,'hex')
  return actual.length===expected.length && timingSafeEqual(actual,expected)
}

export function issueOpaqueToken(){const value=token();return {value,hash:sha256(value)}}

function masterKey(){
  const secret=process.env.NEO_TRIBUNAL_MASTER_KEY || 'development-only-change-me'
  return createHash('sha256').update(secret).digest()
}

export function encryptEnvelope(value){
  const iv=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',masterKey(),iv)
  const plain=Buffer.from(JSON.stringify(value),'utf8')
  const ciphertext=Buffer.concat([cipher.update(plain),cipher.final()])
  const tag=cipher.getAuthTag()
  return {version:1,alg:'A256GCM',iv:iv.toString('base64'),tag:tag.toString('base64'),ciphertext:ciphertext.toString('base64')}
}

export function decryptEnvelope(envelope){
  const decipher=createDecipheriv('aes-256-gcm',masterKey(),Buffer.from(envelope.iv,'base64'))
  decipher.setAuthTag(Buffer.from(envelope.tag,'base64'))
  const plain=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()])
  return JSON.parse(plain.toString('utf8'))
}
