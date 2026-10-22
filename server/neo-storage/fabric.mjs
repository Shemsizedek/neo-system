import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const now=()=>new Date().toISOString()
export const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')

export function encryptObject(bytes,key){
  if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes)
  if(!Buffer.isBuffer(key)||key.length!==32)throw new TypeError('32-byte encryption key required')
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv)
  const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()])
  return {ciphertext,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64')}
}

export function decryptObject(envelope,key){
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'))
  decipher.setAuthTag(Buffer.from(envelope.tag,'base64'))
  return Buffer.concat([decipher.update(envelope.ciphertext),decipher.final()])
}

export function createStorageObject({bytes,storageClass='APPLICATION_DATA',mediaType='application/octet-stream',source=null,key,policy}={}){
  if(bytes==null)throw new TypeError('bytes required')
  const plain=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes)
  const digest=sha256(plain)
  const encrypted=encryptObject(plain,key)
  const classPolicy=policy?.classes?.[storageClass]
  if(!classPolicy)throw new Error('unknown_storage_class')
  return {
    object_id:`sha256:${digest}`,
    content_digest:digest,
    cipher_digest:sha256(encrypted.ciphertext),
    size_bytes:plain.length,
    storage_class:storageClass,
    media_type:mediaType,
    source,
    encryption:{algorithm:'AES-256-GCM',iv:encrypted.iv,tag:encrypted.tag},
    retention:{days:classPolicy.retention_days,created_at:now()},
    replication:{required:classPolicy.replicas,confirmed:0,replicas:[]},
    created_at:now(),
    ciphertext:encrypted.ciphertext
  }
}

export function verifyStoredObject(object,{key}={}){
  try{
    const plaintext=decryptObject({ciphertext:object.ciphertext,iv:object.encryption.iv,tag:object.encryption.tag},key)
    const digest=sha256(plaintext)
    return {valid:digest===object.content_digest,content_digest:digest,size_bytes:plaintext.length}
  }catch(error){return {valid:false,reason:'decrypt_or_integrity_failure'}}
}

export function addReplica(object,{nodeId,provider='neo-owned',location='unspecified',verified=false}={}){
  if(!nodeId)throw new TypeError('nodeId required')
  const replicas=(object.replication?.replicas||[]).filter(r=>r.node_id!==nodeId)
  replicas.push({node_id:nodeId,provider,location,verified:Boolean(verified),recorded_at:now()})
  return {...object,replication:{...object.replication,confirmed:replicas.filter(r=>r.verified).length,replicas}}
}

export function replicationState(object){
  const required=Number(object.replication?.required||1),confirmed=Number(object.replication?.confirmed||0)
  return {required,confirmed,satisfied:confirmed>=required,state:confirmed>=required?'SATISFIED':confirmed>0?'PARTIAL':'UNREPLICATED'}
}

export function retentionAllowsDelete(object,{at=new Date(),approved=false}={}){
  if(!approved)return {allowed:false,reason:'authority_required'}
  const days=Number(object.retention?.days||0)
  if(days===0)return {allowed:false,reason:'indefinite_retention'}
  const expires=+new Date(object.retention.created_at)+days*86400000
  return +new Date(at)>=expires?{allowed:true,reason:'retention_expired'}:{allowed:false,reason:'retention_active',expires_at:new Date(expires).toISOString()}
}

export function createFilesystemStorage(root='data/neo-storage'){
  fs.mkdirSync(path.join(root,'objects'),{recursive:true})
  fs.mkdirSync(path.join(root,'metadata'),{recursive:true})
  const objectPath=d=>path.join(root,'objects',d)
  const metaPath=d=>path.join(root,'metadata',`${d}.json`)
  return {
    put(object){
      fs.writeFileSync(objectPath(object.content_digest),object.ciphertext,{flag:'wx'})
      const {ciphertext,...metadata}=object
      fs.writeFileSync(metaPath(object.content_digest),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'})
      return metadata
    },
    get(digest){
      if(!fs.existsSync(metaPath(digest))||!fs.existsSync(objectPath(digest)))return null
      return {...JSON.parse(fs.readFileSync(metaPath(digest),'utf8')),ciphertext:fs.readFileSync(objectPath(digest))}
    },
    list(){
      return fs.readdirSync(path.join(root,'metadata')).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync(path.join(root,'metadata',x),'utf8')))
    },
    exportBundle(destination){
      fs.mkdirSync(destination,{recursive:true})
      const objects=this.list()
      const manifest={format:'neo-storage-export-v1',exported_at:now(),objects:objects.map(x=>({object_id:x.object_id,content_digest:x.content_digest,cipher_digest:x.cipher_digest,size_bytes:x.size_bytes,storage_class:x.storage_class,media_type:x.media_type,encryption:x.encryption,retention:x.retention,replication:x.replication}))}
      fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
      const out=path.join(destination,'objects');fs.mkdirSync(out,{recursive:true})
      for(const obj of objects)fs.copyFileSync(objectPath(obj.content_digest),path.join(out,obj.content_digest))
      return manifest
    }
  }
}

export function verifyExportBundle(root){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'))
  const errors=[]
  for(const obj of manifest.objects||[]){
    const p=path.join(root,'objects',obj.content_digest)
    if(!fs.existsSync(p)){errors.push({digest:obj.content_digest,error:'missing_object'});continue}
    if(sha256(fs.readFileSync(p))!==obj.cipher_digest)errors.push({digest:obj.content_digest,error:'cipher_digest_mismatch'})
  }
  return {valid:errors.length===0,objects:manifest.objects?.length||0,errors}
}

export function restoreObjectFromExport(root,digest,{key}={}){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'))
  const meta=(manifest.objects||[]).find(x=>x.content_digest===digest)
  if(!meta)throw new Error('object_not_in_manifest')
  const ciphertext=fs.readFileSync(path.join(root,'objects',digest))
  const result=verifyStoredObject({...meta,ciphertext},{key})
  if(!result.valid)throw new Error('restore_verification_failed')
  return decryptObject({ciphertext,iv:meta.encryption.iv,tag:meta.encryption.tag},key)
}
