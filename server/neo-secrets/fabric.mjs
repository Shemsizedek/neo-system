import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const require32=k=>{if(!Buffer.isBuffer(k)||k.length!==32)throw new TypeError('32-byte key required');return k}

export function createKeyRecord({keyId,keyClass='SERVICE',version=1,provider='external',hardwareBacked=false,status='ACTIVE',publicFingerprint=null}={}){
  if(!keyId)throw new TypeError('keyId required')
  return {key_id:String(keyId),key_class:keyClass,version:Number(version),provider,hardware_backed:Boolean(hardwareBacked),status,public_fingerprint:publicFingerprint,created_at:now(),rotated_from:null,revoked_at:null}
}

export function envelopeEncrypt({plaintext,kek,keyId='kek'}={}){
  if(plaintext==null)throw new TypeError('plaintext required')
  require32(kek)
  const dek=crypto.randomBytes(32)
  const dataIv=crypto.randomBytes(12),dataCipher=crypto.createCipheriv('aes-256-gcm',dek,dataIv)
  const bytes=Buffer.isBuffer(plaintext)?plaintext:Buffer.from(String(plaintext))
  const ciphertext=Buffer.concat([dataCipher.update(bytes),dataCipher.final()])
  const dataTag=dataCipher.getAuthTag()
  const wrapIv=crypto.randomBytes(12),wrapCipher=crypto.createCipheriv('aes-256-gcm',kek,wrapIv)
  const wrappedDek=Buffer.concat([wrapCipher.update(dek),wrapCipher.final()])
  const wrapTag=wrapCipher.getAuthTag()
  dek.fill(0)
  return {
    version:1,
    algorithm:'AES-256-GCM',
    key_id:keyId,
    plaintext_digest:hash(bytes),
    ciphertext:ciphertext.toString('base64'),
    data_iv:dataIv.toString('base64'),
    data_tag:dataTag.toString('base64'),
    wrapped_dek:wrappedDek.toString('base64'),
    wrap_iv:wrapIv.toString('base64'),
    wrap_tag:wrapTag.toString('base64'),
    created_at:now()
  }
}

export function envelopeDecrypt({envelope,kek}={}){
  require32(kek)
  if(!envelope?.wrapped_dek)throw new TypeError('envelope required')
  const wrapDecipher=crypto.createDecipheriv('aes-256-gcm',kek,Buffer.from(envelope.wrap_iv,'base64'))
  wrapDecipher.setAuthTag(Buffer.from(envelope.wrap_tag,'base64'))
  const dek=Buffer.concat([wrapDecipher.update(Buffer.from(envelope.wrapped_dek,'base64')),wrapDecipher.final()])
  try{
    const decipher=crypto.createDecipheriv('aes-256-gcm',dek,Buffer.from(envelope.data_iv,'base64'))
    decipher.setAuthTag(Buffer.from(envelope.data_tag,'base64'))
    const plain=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()])
    if(hash(plain)!==envelope.plaintext_digest)throw new Error('plaintext_digest_mismatch')
    return plain
  }finally{dek.fill(0)}
}

export function createSecretLease({secretId,subject,ttlSeconds=900,maxTtlSeconds=3600,scopes=[]}={}){
  if(!secretId||!subject)throw new TypeError('secretId and subject required')
  const ttl=Math.min(Math.max(1,Number(ttlSeconds)),Number(maxTtlSeconds))
  const issued=Date.now()
  return {lease_id:`LEASE-${crypto.randomUUID()}`,secret_id:String(secretId),subject:String(subject),scopes:[...new Set(scopes)],issued_at:new Date(issued).toISOString(),expires_at:new Date(issued+ttl*1000).toISOString(),status:'ACTIVE'}
}

export function validateSecretLease({lease,subject,scope,at=new Date()}={}){
  if(!lease)return {valid:false,reason:'missing_lease'}
  if(lease.status!=='ACTIVE')return {valid:false,reason:'lease_inactive'}
  if(lease.subject!==subject)return {valid:false,reason:'subject_mismatch'}
  if(+new Date(at)>=+new Date(lease.expires_at))return {valid:false,reason:'lease_expired'}
  if(scope&&!lease.scopes.includes(scope)&&!lease.scopes.includes('*'))return {valid:false,reason:'scope_denied'}
  return {valid:true,reason:'authorized'}
}

export function thresholdDecision({approvals=[],required=1,total=1,eligibleSigners=[]}={}){
  const unique=[...new Set(approvals.filter(x=>x?.approved===true&&x?.signer).map(x=>x.signer))]
  const eligible=eligibleSigners.length?unique.filter(x=>eligibleSigners.includes(x)):unique
  return {required:Number(required),total:Number(total),approved:eligible.length,authorized:eligible.length>=Number(required),signers:eligible}
}

export function authorizeKeyUse({keyRecord,policy,approvals=[],eligibleSigners=[],purpose}={}){
  if(!keyRecord||!policy)return {authorized:false,reason:'missing_input'}
  if(keyRecord.status!=='ACTIVE')return {authorized:false,reason:'key_inactive'}
  const cfg=policy.key_classes?.[keyRecord.key_class]
  if(!cfg)return {authorized:false,reason:'unknown_key_class'}
  const threshold=thresholdDecision({approvals,required:cfg.threshold.required,total:cfg.threshold.total,eligibleSigners})
  return {authorized:threshold.authorized,reason:threshold.authorized?'authorized':'threshold_not_met',purpose:purpose||null,threshold}
}

export function rotateKeyRecord({current,newKeyId,provider=current?.provider,hardwareBacked=current?.hardware_backed}={}){
  if(!current||!newKeyId)throw new TypeError('current and newKeyId required')
  const at=now()
  return {
    previous:{...clone(current),status:'ROTATED',revoked_at:at,replaced_by:newKeyId},
    next:{...createKeyRecord({keyId:newKeyId,keyClass:current.key_class,version:Number(current.version||1)+1,provider,hardwareBacked}),rotated_from:current.key_id}
  }
}

export function revokeKeyRecord({keyRecord,reason='revoked'}={}){
  if(!keyRecord)throw new TypeError('keyRecord required')
  return {...clone(keyRecord),status:'REVOKED',revoked_at:now(),revocation_reason:reason}
}

export function createRecoveryPlan({secretId,shares=3,threshold=2,custodians=[]}={}){
  if(!secretId)throw new TypeError('secretId required')
  if(threshold<2||threshold>shares)throw new Error('invalid_threshold')
  return {recovery_id:`REC-${crypto.randomUUID()}`,secret_id:String(secretId),shares:Number(shares),threshold:Number(threshold),custodians:[...custodians],status:'PLANNED',created_at:now(),material_embedded:false}
}

export function secretsSnapshot({keys=[],leases=[],recoveryPlans=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Sovereign Secrets and Key Management',
    keys:{total:keys.length,active:keys.filter(k=>k.status==='ACTIVE').length,revoked:keys.filter(k=>k.status==='REVOKED').length},
    leases:{total:leases.length,active:leases.filter(l=>l.status==='ACTIVE'&&+new Date(l.expires_at)>Date.now()).length},
    recovery_plans:recoveryPlans.length,
    plaintext_secret_persistence:false,
    generated_at:now()
  }
}
