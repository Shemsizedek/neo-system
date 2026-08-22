import type {TribunalCase} from './tribunalEngine'
import type {TribunalPrincipal} from './rbac'

export interface DocketVersion {
  version:number
  claimNo:string
  createdAt:string
  actor:string
  previousHash?:string
  hash:string
  signature:string
  publicKeyJwk:JsonWebKey
  caseFile:TribunalCase
}

interface EncryptedEvidenceRecord {
  id:string
  claimNo:string
  exhibitId:string
  fileName:string
  mediaType:string
  sizeBytes:number
  salt:number[]
  iv:number[]
  ciphertext:ArrayBuffer
  storedAt:string
}

const text = new TextEncoder()
const dbName='neo-tribunal-v1'
const evidenceStore='encrypted-evidence'
const keyStore='signing-keys'

function bytesToHex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('')}
function bytesToB64(bytes:ArrayBuffer){let out='';for(const b of new Uint8Array(bytes))out+=String.fromCharCode(b);return btoa(out)}

async function digest(value:string){return bytesToHex(await crypto.subtle.digest('SHA-256',text.encode(value)))}

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(dbName,1)
    request.onupgradeneeded=()=>{
      const db=request.result
      if(!db.objectStoreNames.contains(evidenceStore)) db.createObjectStore(evidenceStore,{keyPath:'id'})
      if(!db.objectStoreNames.contains(keyStore)) db.createObjectStore(keyStore,{keyPath:'id'})
    }
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error)
  })
}

function idbPut(store:string,value:unknown):Promise<void>{
  return openDb().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}
  }))
}

function idbGet<T>(store:string,id:string):Promise<T|undefined>{
  return openDb().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readonly');const request=tx.objectStore(store).get(id);request.onsuccess=()=>{db.close();resolve(request.result as T|undefined)};request.onerror=()=>{db.close();reject(request.error)}
  }))
}

async function deriveEvidenceKey(passphrase:string,salt:Uint8Array){
  const base=await crypto.subtle.importKey('raw',text.encode(passphrase),'PBKDF2',false,['deriveKey'])
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])
}

export async function storeEncryptedEvidence(claimNo:string,exhibitId:string,file:File,passphrase:string){
  if(passphrase.length<8) throw new Error('Evidence passphrase must be at least 8 characters.')
  const salt=crypto.getRandomValues(new Uint8Array(16));const iv=crypto.getRandomValues(new Uint8Array(12));const key=await deriveEvidenceKey(passphrase,salt)
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,await file.arrayBuffer())
  const record:EncryptedEvidenceRecord={id:`${claimNo}:${exhibitId}`,claimNo,exhibitId,fileName:file.name,mediaType:file.type||'application/octet-stream',sizeBytes:file.size,salt:Array.from(salt),iv:Array.from(iv),ciphertext,storedAt:new Date().toISOString()}
  await idbPut(evidenceStore,record)
  return {storedAt:record.storedAt,fileName:record.fileName,sizeBytes:record.sizeBytes}
}

export async function recoverEncryptedEvidence(claimNo:string,exhibitId:string,passphrase:string){
  const record=await idbGet<EncryptedEvidenceRecord>(evidenceStore,`${claimNo}:${exhibitId}`)
  if(!record) throw new Error('Encrypted exhibit is not present on this device.')
  const key=await deriveEvidenceKey(passphrase,new Uint8Array(record.salt))
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(record.iv)},key,record.ciphertext)
  return new File([plain],record.fileName,{type:record.mediaType})
}

async function signingKeyPair(){
  const id='tribunal-device-key'
  const stored=await idbGet<{id:string;privateKey:CryptoKey;publicKey:CryptoKey}>(keyStore,id)
  if(stored)return stored
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify'])
  const value={id,privateKey:pair.privateKey,publicKey:pair.publicKey};await idbPut(keyStore,value);return value
}

export async function signAuditPayload(payload:string){
  const pair=await signingKeyPair();const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,text.encode(payload));const publicKeyJwk=await crypto.subtle.exportKey('jwk',pair.publicKey)
  return {signature:bytesToB64(signature),publicKeyJwk}
}

export async function verifyAuditPayload(payload:string,signature:string,publicKeyJwk:JsonWebKey){
  const key=await crypto.subtle.importKey('jwk',publicKeyJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);const raw=Uint8Array.from(atob(signature),c=>c.charCodeAt(0));return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,raw,text.encode(payload))
}

function historyKey(claimNo:string){return `neo:docket:${claimNo}`}
export function readDocketHistory(claimNo:string):DocketVersion[]{try{return JSON.parse(localStorage.getItem(historyKey(claimNo))||'[]') as DocketVersion[]}catch{return []}}

export async function saveDocketVersion(caseFile:TribunalCase,principal:TribunalPrincipal){
  const history=readDocketHistory(caseFile.claimNo);const version=history.length+1;const previousHash=history.at(-1)?.hash
  const canonical=JSON.stringify({version,claimNo:caseFile.claimNo,previousHash,caseFile});const hash=await digest(canonical);const signed=await signAuditPayload(hash)
  const snapshot:DocketVersion={version,claimNo:caseFile.claimNo,createdAt:new Date().toISOString(),actor:`${principal.displayName} (${principal.role})`,previousHash,hash,signature:signed.signature,publicKeyJwk:signed.publicKeyJwk,caseFile}
  localStorage.setItem(historyKey(caseFile.claimNo),JSON.stringify([...history,snapshot]));return snapshot
}

export async function verifyDocketVersion(version:DocketVersion){
  const canonical=JSON.stringify({version:version.version,claimNo:version.claimNo,previousHash:version.previousHash,caseFile:version.caseFile});const expected=await digest(canonical);if(expected!==version.hash)return false;return verifyAuditPayload(version.hash,version.signature,version.publicKeyJwk)
}
