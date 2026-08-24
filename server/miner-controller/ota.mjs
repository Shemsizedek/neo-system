import crypto from 'node:crypto'
import fs from 'node:fs/promises'

export function verifyManifest(manifest,signatureBase64,publicKeyPem){
  const payload=JSON.stringify(manifest)
  return crypto.verify(null,Buffer.from(payload),publicKeyPem,Buffer.from(signatureBase64,'base64'))
}

export function validateManifest(manifest,currentVersion){
  if(!manifest||typeof manifest!=='object') return {ok:false,reason:'Invalid manifest'}
  for(const key of ['version','artifactUrl','sha256']) if(!manifest[key]) return {ok:false,reason:`Missing ${key}`}
  if(!String(manifest.artifactUrl).startsWith('https://')) return {ok:false,reason:'Artifact URL must use HTTPS'}
  if(!/^[a-f0-9]{64}$/i.test(String(manifest.sha256))) return {ok:false,reason:'Invalid SHA-256 digest'}
  if(manifest.version===currentVersion) return {ok:false,reason:'Already current'}
  return {ok:true,reason:'Update candidate'}
}

export async function sha256File(path){
  const data=await fs.readFile(path)
  return crypto.createHash('sha256').update(data).digest('hex')
}

export async function stageUpdate({manifest,signatureBase64,publicKeyPath,currentVersion,downloadImpl,stagingPath}){
  const publicKeyPem=await fs.readFile(publicKeyPath,'utf8')
  if(!verifyManifest(manifest,signatureBase64,publicKeyPem)) throw new Error('OTA manifest signature invalid')
  const validation=validateManifest(manifest,currentVersion)
  if(!validation.ok) throw new Error(validation.reason)
  await downloadImpl(manifest.artifactUrl,stagingPath)
  const digest=await sha256File(stagingPath)
  if(digest.toLowerCase()!==String(manifest.sha256).toLowerCase()) throw new Error('OTA artifact hash mismatch')
  return {ok:true,version:manifest.version,stagingPath,digest}
}
