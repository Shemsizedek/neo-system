import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {createHandler} from '../server.js'
import {actorFromClaims} from '../auth.js'

function request(server,{method='GET',path='/',body}={}){
  return new Promise((resolve,reject)=>{
    const port=server.address().port
    const req=http.request({host:'127.0.0.1',port,method,path,headers:{authorization:'Bearer test','content-type':'application/json'}},res=>{
      const chunks=[]
      res.on('data',c=>chunks.push(c))
      res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString()||'{}')}))
    })
    req.on('error',reject)
    if(body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function withServer(handler,fn){
  const server=http.createServer(handler)
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  try{return await fn(server)}finally{await new Promise(resolve=>server.close(resolve))}
}

test('actorFromClaims maps tenant and role claims',()=>{
  const actor=actorFromClaims({sub:'u-1',actor_type:'user',roles:'viewer,operator',tenant_ids:['neo-prime'],surface:'api'})
  assert.equal(actor.id,'u-1')
  assert.deepEqual(actor.roles,['viewer','operator'])
  assert.deepEqual(actor.tenantIds,['neo-prime'])
})

test('health is public and execution remains disabled',async()=>{
  const handler=createHandler({repository:{},verify:async()=>{throw new Error('should not authenticate')}})
  await withServer(handler,async server=>{
    const res=await request(server,{path:'/health'})
    assert.equal(res.status,200)
    assert.equal(res.body.status,'ok')
    assert.equal(res.body.executionWorker,false)
  })
})

test('pending approvals are tenant-scoped through repository actor',async()=>{
  let seen
  const repository={listPending:async(tenant,actor,limit)=>{seen={tenant,actor,limit};return[{intent_id:'i-1',status:'pending_approval'}]}}
  const verify=async()=>({id:'discord-reader',type:'user',roles:['viewer'],tenantIds:['neo-prime'],surface:'discord'})
  const handler=createHandler({repository,verify})
  await withServer(handler,async server=>{
    const res=await request(server,{path:'/intents?tenantId=neo-prime&status=pending_approval&limit=10'})
    assert.equal(res.status,200)
    assert.equal(res.body.items[0].intent_id,'i-1')
    assert.equal(seen.tenant,'neo-prime')
    assert.equal(seen.actor.surface,'discord')
  })
})

test('intent POST returns 202 and delegates authorization to repository',async()=>{
  const repository={createIntent:async(input,actor)=>({intent_id:input.intentId,tenant_id:input.tenantId,status:'pending_approval',actor_id:actor.id})}
  const verify=async()=>({id:'operator-1',type:'user',roles:['operator'],tenantIds:['neo-prime'],surface:'api'})
  const handler=createHandler({repository,verify})
  await withServer(handler,async server=>{
    const res=await request(server,{method:'POST',path:'/intents',body:{intentId:'i-2',tenantId:'neo-prime'}})
    assert.equal(res.status,202)
    assert.equal(res.body.status,'pending_approval')
  })
})

test('authorization failures map to 403',async()=>{
  const handler=createHandler({repository:{listPending:async()=>[]},verify:async()=>{throw new Error('tenant boundary denied')}})
  await withServer(handler,async server=>{
    const res=await request(server,{path:'/intents?tenantId=neopay'})
    assert.equal(res.status,403)
  })
})
