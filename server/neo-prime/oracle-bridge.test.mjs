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
