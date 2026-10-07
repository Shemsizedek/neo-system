import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyCrownAuthorization} from './verify.mjs'

const response=(ok,body)=>({ok,async json(){return body}})

test('permits an explicitly verified Crown capability',async()=>{
  const result=await verifyCrownAuthorization({
    authorization:'token',
    requiredScope:'neo-pay.wallet.request',
    fetchImpl:async()=>response(true,{valid:true,service_id:'crown:btc:app:neo-pay',scopes:['neo-pay.wallet.request'],expires_at:9999999999,manifest_hash:'abc'})
  })
  assert.equal(result.ok,true)
  assert.equal(result.service_id,'crown:btc:app:neo-pay')
})

test('fails closed without authorization',async()=>{
  const result=await verifyCrownAuthorization({authorization:'',requiredScope:'crown.api.read',fetchImpl:async()=>{throw new Error('must not call')}})
  assert.equal(result.status,401)
})

test('fails closed when Crown is unavailable',async()=>{
  const result=await verifyCrownAuthorization({authorization:'token',requiredScope:'crown.api.read',fetchImpl:async()=>{throw new Error('down')}})
  assert.deepEqual({ok:result.ok,status:result.status,error:result.error},{ok:false,status:503,error:'CROWN_UNAVAILABLE'})
})

test('rejects invalid or wrong-scope claims',async()=>{
  const invalid=await verifyCrownAuthorization({authorization:'token',requiredScope:'neo-pay.wallet.request',fetchImpl:async()=>response(true,{valid:false,scopes:[]})})
  assert.equal(invalid.status,403)
  const wrongScope=await verifyCrownAuthorization({authorization:'token',requiredScope:'neo-pay.wallet.request',fetchImpl:async()=>response(true,{valid:true,service_id:'crown:btc:app:neo-pay',scopes:['crown.api.read']})})
  assert.equal(wrongScope.error,'CROWN_SCOPE_MISMATCH')
})
