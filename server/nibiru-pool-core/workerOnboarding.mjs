import crypto from 'node:crypto'
import {createWorkerCredential} from './workerAuth.mjs'
import {NibiruPoolStore} from './persistence.mjs'

export function createWorkerSecret(bytes=24){
  if(!Number.isInteger(bytes)||bytes<16)throw new Error('WORKER_SECRET_BYTES_TOO_SMALL')
  return crypto.randomBytes(bytes).toString('base64url')
}

export function onboardWorker({poolId='world-mint-genesis',workerId,memberId,dbPath,secret=createWorkerSecret()}={}){
  if(!workerId||!memberId)throw new Error('WORKER_AND_MEMBER_REQUIRED')
  const credential=createWorkerCredential({poolId,workerId,memberId,secret})
  const store=new NibiruPoolStore(dbPath)
  try{store.saveCredential(credential)}finally{store.close()}
  return Object.freeze({poolId,workerId,memberId,credentialId:credential.credentialId,secret})
}

export function credentialResolverFromStore(store,poolId='world-mint-genesis'){
  if(!store?.store?.list)throw new Error('NIBIRU_STORE_REQUIRED')
  return async workerId=>store.store.list('nibiru_worker_credential').find(item=>item.poolId===poolId&&item.workerId===workerId&&item.state==='ACTIVE')||null
}
