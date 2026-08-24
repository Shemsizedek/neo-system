import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function ensureDir(dir,mode=0o700){await fs.mkdir(dir,{recursive:true,mode})}

export async function generateAgentKeypair({privateKeyPath,publicKeyPath}){
  await ensureDir(path.dirname(privateKeyPath))
  await ensureDir(path.dirname(publicKeyPath))
  const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519')
  const privatePem=privateKey.export({type:'pkcs8',format:'pem'})
  const publicPem=publicKey.export({type:'spki',format:'pem'})
  await fs.writeFile(privateKeyPath,privatePem,{mode:0o600})
  await fs.writeFile(publicKeyPath,publicPem,{mode:0o644})
  return {privateKeyPath,publicKeyPath}
}

export async function writeSecureJson(file,data,mode=0o600){
  await ensureDir(path.dirname(file))
  await fs.writeFile(file,JSON.stringify(data,null,2)+'\n',{mode})
  return file
}

export function buildProvisionedAgentConfig({agentId,minerId,gatewayUrl,privateKeyPath,adapter='reference',minerHost='127.0.0.1',allowControl=false}){
  if(!gatewayUrl.startsWith('https://')) throw new Error('gatewayUrl must use HTTPS')
  return {agentId,minerId,gatewayUrl,privateKeyPath,pollIntervalMs:5000,adapter,minerHost,allowControl}
}
