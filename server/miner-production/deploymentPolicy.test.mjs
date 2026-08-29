import test from 'node:test'
import assert from 'node:assert/strict'
import {validateOperatorDeploymentPolicy} from './deploymentPolicy.mjs'

test('accepts separate HTTPS origins under the same private site suffix',()=>{
  const result=validateOperatorDeploymentPolicy({consoleOrigin:'https://console.neo.example.com',operatorPublicUrl:'https://operator.neo.example.com',siteSuffix:'neo.example.com',sameSite:'Lax',secure:true,requireSameSite:true})
  assert.equal(result.ok,true)
  assert.equal(result.sameSiteDomain,true)
  assert.equal(result.sameSite,'Lax')
})

test('rejects cross-site operator API when same-site mode is required',()=>{
  assert.throws(()=>validateOperatorDeploymentPolicy({consoleOrigin:'https://console.neo.example.com',operatorPublicUrl:'https://operator.other.example',siteSuffix:'neo.example.com',sameSite:'Lax',secure:true,requireSameSite:true}),/OPERATOR_SAME_SITE_DOMAIN_REQUIRED/)
})

test('rejects insecure cookie deployment',()=>{
  assert.throws(()=>validateOperatorDeploymentPolicy({consoleOrigin:'https://console.neo.example.com',operatorPublicUrl:'https://operator.neo.example.com',siteSuffix:'neo.example.com',sameSite:'Lax',secure:false,requireSameSite:true}),/OPERATOR_SECURE_COOKIE_REQUIRED/)
})

test('rejects SameSite=None in required same-site mode',()=>{
  assert.throws(()=>validateOperatorDeploymentPolicy({consoleOrigin:'https://console.neo.example.com',operatorPublicUrl:'https://operator.neo.example.com',siteSuffix:'neo.example.com',sameSite:'None',secure:true,requireSameSite:true}),/OPERATOR_SAMESITE_NONE_NOT_ALLOWED_IN_SAME_SITE_MODE/)
})

test('requires HTTPS for both public origins',()=>{
  assert.throws(()=>validateOperatorDeploymentPolicy({consoleOrigin:'http://console.neo.example.com',operatorPublicUrl:'https://operator.neo.example.com',siteSuffix:'neo.example.com',sameSite:'Lax',secure:true,requireSameSite:true}),/HTTPS_REQUIRED/)
})
