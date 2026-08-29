import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {createHandler} from '../server.js'

function request(server,{path,token='read-secret'}={}){
  return new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:server.address().port,path,headers:{authorization:`Bearer ${token}`}},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString()||'{}')}))
    })
    req.on('error',reject);req.end()
  })
}

async function withServer(handler,fn){
  const server=http.createServer(handler)
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  try{return await fn(server)}finally{await new Promise(resolve=>server.close(resolve))}
}

const env={RELATIONS_DISCORD_OPERATOR_READ_TOKEN:'read-secret',RELATIONS_DISCORD_TENANT_IDS:'neo-prime,neopay'}

test('Discord summary returns aggregate count only for allowed tenant',async()=>{
  const repository={countPending:async tenant=>tenant==='neo-prime'?4:0}
  const handler=createHandler({repository,verify:async()=>{throw new Error('JWT auth should not run')},env})
  await withServer(handler,async server=>{
    const res=await request(server,{path:'/discord/pending-summary?tenantId=neo-prime'})
    assert.equal(res.status,200)
    assert.deepEqual(res.body,{tenantId:'neo-prime',pendingApprovals:4,readOnly:true,recordsIncluded:false})
    assert.equal('items' in res.body,false)
    assert.equal('payload' in res.body,false)
  })
})

test('Discord summary rejects bad token before repository read',async()=>{
  let called=false
  const handler=createHandler({repository:{countPending:async()=>{called=true;return 1}},verify:async()=>{},env})
  await withServer(handler,async server=>{
    const res=await request(server,{path:'/discord/pending-summary?tenantId=neo-prime',token:'wrong'})
    assert.equal(res.status,401)
    assert.equal(called,false)
  })
})

test('Discord summary rejects tenant outside explicit allowlist',async()=>{
  let called=false
  const handler=createHandler({repository:{countPending:async()=>{called=true;return 1}},verify:async()=>{},env})
  await withServer(handler,async server=>{
    const res=await request(server,{path:'/discord/pending-summary?tenantId=unknown'})
    assert.equal(res.status,403)
    assert.equal(called,false)
  })
})
