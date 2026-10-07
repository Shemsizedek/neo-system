import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {once} from 'node:events'
import {createFirestoreHandler} from './firestore-server.mjs'

async function withServer(crownAuthorizer,fn){
  let writes=0
  const ctx={
    sessionPrincipal:async()=>({kind:'admin',merchantId:'m1',terminalId:'t1',permissions:['register','settings']}),
    can:()=>true,
    putEnvelope:async row=>{writes++;return row},
    appendEvent:async row=>{writes++;return row},
    listEvents:async()=>[],
    getState:async()=>null,
    revoke:async()=>{}
  }
  const server=http.createServer(createFirestoreHandler(ctx,{crownAuthorizer}))
  server.listen(0,'127.0.0.1');await once(server,'listening')
  const base=`http://127.0.0.1:${server.address().port}`
  try{await fn(base,()=>writes)}finally{server.close();await once(server,'close')}
}

test('NEO Counter checkout mutations fail closed when Crown denies capability',async()=>{
  await withServer(async scope=>{assert.equal(scope,'neo-counter.checkout');return{verified:false,error:'crown_capability_denied'}},async(base,writes)=>{
    const r=await fetch(base+'/sync',{method:'POST',headers:{authorization:'Bearer session','content-type':'application/json'},body:JSON.stringify({merchantId:'m1',entity:'register',terminalId:'t1',version:1})})
    assert.equal(r.status,403)
    assert.equal((await r.json()).required_scope,'neo-counter.checkout')
    assert.equal(writes(),0)
  })
})

test('NEO Counter permits authenticated mutation after Crown checkout proof',async()=>{
  await withServer(async()=>({verified:true}),async(base,writes)=>{
    const r=await fetch(base+'/merchant/m1/events',{method:'POST',headers:{authorization:'Bearer session','content-type':'application/json'},body:JSON.stringify({type:'checkout.reviewed'})})
    assert.equal(r.status,201)
    assert.equal(writes(),1)
  })
})
