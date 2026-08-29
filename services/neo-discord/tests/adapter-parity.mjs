import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import cloudflareWorker from '../adapters/cloudflare/worker.js'
import { createNodeHttpHandler } from '../adapters/node-http/handler.js'

const {publicKey,privateKey}=generateKeyPairSync('ed25519')
const publicHex=publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex')
const env={DISCORD_PUBLIC_KEY:publicHex,DISCORD_ALLOWED_USER_IDS:'u1',DISCORD_ALLOWED_GUILD_IDS:'g1'}

function signedRequest(payload){
  const raw=JSON.stringify(payload)
  const ts='1788029000'
  const sig=sign(null,Buffer.from(ts+raw),privateKey).toString('hex')
  return new Request('https://discord.example/discord/interactions',{method:'POST',headers:{'content-type':'application/json','x-signature-ed25519':sig,'x-signature-timestamp':ts},body:raw})
}

function mockFetch(url,init={}){
  const href=String(url)
  if(href.includes('discord.com/api/v10/webhooks/'))return Promise.resolve(new Response('{}',{status:200,headers:{'content-type':'application/json'}}))
  if(href.includes('/contents/apps/neo-relations/contracts/control-plane.json')){
    const body={content:Buffer.from(JSON.stringify({frontend:{primary:'github-pages'},backend:{sourceOfTruth:'github',orchestration:'github-actions',transactionalWrites:'disabled'},apiPlane:{primary:'discord'},transport:{role:'thin-https-adapter-only'},architectureVersion:'3.0.0'})).toString('base64')}
    return Promise.resolve(new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}}))
  }
  return Promise.resolve(new Response('{}',{status:200,headers:{'content-type':'application/json'}}))
}

async function runCloudflare(payload,customEnv=env){
  const pending=[]
  const response=await cloudflareWorker.fetch(signedRequest(payload),customEnv,{waitUntil:p=>pending.push(Promise.resolve(p)),fetchImpl:mockFetch})
  await Promise.allSettled(pending)
  return {status:response.status,body:await response.json()}
}

async function runNode(payload,customEnv=env){
  const pending=[]
  const handle=createNodeHttpHandler()
  const response=await handle(signedRequest(payload),customEnv,{waitUntil:p=>pending.push(Promise.resolve(p)),fetchImpl:mockFetch})
  await Promise.allSettled(pending)
  return {status:response.status,body:await response.json()}
}

const base={application_id:'app',token:'token',guild_id:'g1',channel_id:'c1',member:{user:{id:'u1',username:'tester'}}}

for(const [name,payload] of [
  ['ping',{...base,type:1}],
  ['neo',{...base,type:2,data:{name:'neo',options:[{name:'prompt',value:'status'}]}}],
  ['relations',{...base,type:2,data:{name:'relations',options:[{name:'architecture'}]}}],
  ['unknown',{...base,type:2,data:{name:'unknown'}}]
]){
  test(`Cloudflare and Node adapters have parity for ${name}`,async()=>{
    assert.deepEqual(await runNode(payload),await runCloudflare(payload))
  })
}

test('Cloudflare and Node adapters have parity for authorization denial',async()=>{
  const payload={...base,type:2,data:{name:'neo',options:[{name:'prompt',value:'status'}]}}
  const denied={...env,DISCORD_ALLOWED_USER_IDS:'other'}
  assert.deepEqual(await runNode(payload,denied),await runCloudflare(payload,denied))
})

test('Cloudflare and Node adapters reject invalid signatures equally',async()=>{
  const payload={...base,type:1}
  const raw=JSON.stringify(payload)
  const request=()=>new Request('https://discord.example/discord/interactions',{method:'POST',headers:{'content-type':'application/json','x-signature-ed25519':'00','x-signature-timestamp':'1'},body:raw})
  const node=await createNodeHttpHandler()(request(),env,{fetchImpl:mockFetch})
  const cf=await cloudflareWorker.fetch(request(),env,{waitUntil:()=>{},fetchImpl:mockFetch})
  assert.equal(node.status,401)
  assert.equal(cf.status,401)
  assert.deepEqual(await node.json(),await cf.json())
})
