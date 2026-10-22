import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { createPrimeHttpServer } from './server.mjs'
const token = 'a'.repeat(48)
test('private Oracle rejects missing authorization before processing', async () => {
 const server=createPrimeHttpServer({env:{NEO_ORACLE_BRIDGE_TOKEN:token},providers:[]})
 server.listen(0,'127.0.0.1');await once(server,'listening')
 try{
  const base='http://127.0.0.1:'+server.address().port
  const response=await fetch(base+'/api/oracle/private',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({objective:'hello'})})
  assert.equal(response.status,401)
  assert.equal((await response.json()).error,'service_auth_required')
 }finally{server.close();await once(server,'close')}
})
test('private Oracle fails closed when bridge token unconfigured',async()=>{
 const server=createPrimeHttpServer({env:{},providers:[]})
 server.listen(0,'127.0.0.1');await once(server,'listening')
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/oracle/private'
  const response=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({objective:'hello'})})
  assert.equal(response.status,401)
 }finally{server.close();await once(server,'close')}
})

test('private Oracle accepts a valid service token for read-only analysis',async()=>{
 const provider={id:'gemini',configured:true,async invoke({prompt}){return {provider:'gemini',text:'Verified: '+prompt}}}
 const server=createPrimeHttpServer({env:{NEO_ORACLE_BRIDGE_TOKEN:token},providers:[provider]})
 server.listen(0,'127.0.0.1');await once(server,'listening')
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/oracle/private'
  const response=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({missionId:'gem-132-test',objective:'Describe Bitcoin',capability:'reasoning',requestedAction:'analyze'})})
  assert.equal(response.status,200)
  const result=await response.json()
  assert.equal(result.ok,true)
 }finally{server.close();await once(server,'close')}
})
