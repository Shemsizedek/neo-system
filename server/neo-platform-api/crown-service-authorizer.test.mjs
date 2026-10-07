import test from 'node:test'
import assert from 'node:assert/strict'
import {createCrownServiceAuthorizer} from './crown-service-authorizer.mjs'

const response=(status,body)=>({ok:status>=200&&status<300,status,async json(){return body}})

test('proves an allow-listed service capability through its Crown workload agent',async()=>{
  const calls=[]
  const authorize=createCrownServiceAuthorizer({
    agents:{neopass:{url:'https://agent.example',operatorToken:'operator-secret'}},
    fetchImpl:async(url,init)=>{calls.push({url,init});return response(200,{verified:true,scopes:['neopass.signer.request'],expires_in:300})}
  })
  const result=await authorize('neopass','neopass.signer.request')
  assert.equal(result.verified,true)
  assert.equal(calls[0].url,'https://agent.example/crown/prove')
  assert.equal(calls[0].init.headers.authorization,'Bearer operator-secret')
  assert.deepEqual(JSON.parse(calls[0].init.body),{scopes:['neopass.signer.request']})
})

test('fails closed for missing agent config, unavailable agent, and wrong scope',async()=>{
  const missing=createCrownServiceAuthorizer({agents:{}})
  assert.equal((await missing('neopass','neopass.signer.request')).verified,false)
  const down=createCrownServiceAuthorizer({agents:{neopass:{url:'https://agent.example',operatorToken:'x'}},fetchImpl:async()=>{throw new Error('down')}})
  assert.equal((await down('neopass','neopass.signer.request')).error,'crown_service_authorizer_unavailable')
  const wrong=createCrownServiceAuthorizer({agents:{neopass:{url:'https://agent.example',operatorToken:'x'}},fetchImpl:async()=>response(200,{verified:true,scopes:['crown.api.read']})})
  assert.equal((await wrong('neopass','neopass.signer.request')).error,'crown_capability_denied')
})
