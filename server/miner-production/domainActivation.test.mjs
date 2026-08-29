import test from 'node:test'
import assert from 'node:assert/strict'
import {validateActivationConfig,probeOperatorEdge} from './domainActivation.mjs'

const headers=values=>({get:key=>values[String(key).toLowerCase()]??null})
const response=(status,body,headerValues={})=>({ok:status>=200&&status<300,status,headers:headers(headerValues),json:async()=>body})

test('activation requires separate https origins under the same site suffix',()=>{
  const result=validateActivationConfig({consoleOrigin:'https://console.neo.example.com',operatorApi:'https://operator.neo.example.com',siteSuffix:'neo.example.com'})
  assert.equal(result.operatorHost,'operator.neo.example.com')
  assert.throws(()=>validateActivationConfig({consoleOrigin:'http://console.neo.example.com',operatorApi:'https://operator.neo.example.com',siteSuffix:'neo.example.com'}),/ACTIVATION_HTTPS_REQUIRED/)
  assert.throws(()=>validateActivationConfig({consoleOrigin:'https://console.other.example',operatorApi:'https://operator.neo.example.com',siteSuffix:'neo.example.com'}),/ACTIVATION_ORIGIN_OUTSIDE_SITE_SUFFIX/)
  assert.throws(()=>validateActivationConfig({consoleOrigin:'https://operator.neo.example.com',operatorApi:'https://operator.neo.example.com',siteSuffix:'neo.example.com'}),/ACTIVATION_SEPARATE_ORIGINS_REQUIRED/)
})

test('edge probe requires exact credentialed cors, ready backend, and anonymous blocking',async()=>{
  const queue=[
    response(200,{status:'UP'},{'access-control-allow-origin':'https://console.neo.example.com','access-control-allow-credentials':'true','cf-ray':'abc-SJC','server':'cloudflare'}),
    response(200,{status:'READY'}),
    response(401,{error:'OPERATOR_SESSION_REQUIRED'})
  ]
  const result=await probeOperatorEdge({operatorApi:'https://operator.neo.example.com',consoleOrigin:'https://console.neo.example.com',fetchImpl:async()=>queue.shift()})
  assert.equal(result.cloudflareEdge,true)
  assert.equal(result.ready.status,'READY')
})

test('edge probe fails closed when private backend is not ready',async()=>{
  const queue=[
    response(200,{status:'UP'},{'access-control-allow-origin':'https://console.neo.example.com','access-control-allow-credentials':'true'}),
    response(503,{status:'BLOCKED'})
  ]
  await assert.rejects(()=>probeOperatorEdge({operatorApi:'https://operator.neo.example.com',consoleOrigin:'https://console.neo.example.com',fetchImpl:async()=>queue.shift()}),/ACTIVATION_READY_FAILED_503/)
})
