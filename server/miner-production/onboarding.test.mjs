import test from 'node:test'
import assert from 'node:assert/strict'
import {createInfrastructureRecord,markInfrastructureVerified,infrastructureIsGreen,onboardingSummary} from './onboarding.mjs'

test('infrastructure stays blocked until verified probe',()=>{
  const r=createInfrastructureRecord({type:'STRATUM_POOL',name:'Pool A',endpoint:'stratum+ssl://pool.example:443'})
  assert.equal(infrastructureIsGreen(r),false)
  const v=markInfrastructureVerified(r,{ok:true,detail:'connected'})
  assert.equal(infrastructureIsGreen(v),true)
})

test('onboarding summary requires every production infrastructure type',()=>{
  const mk=(type,endpoint)=>markInfrastructureVerified(createInfrastructureRecord({type,name:type,endpoint}),{ok:true})
  const records=[
    mk('BITCOIN_RPC','http://127.0.0.1:8332'),
    mk('COUNTERPARTY_API','https://x.example'),
    mk('STRATUM_POOL','stratum+ssl://pool.example:443'),
    mk('MINER_AGENT','https://miner.example'),
    mk('FX_PROVIDER','https://fx.example'),
    mk('PAYMENT_PROVIDER','https://pay.example')
  ]
  assert.equal(onboardingSummary(records).ready,true)
})

test('https is required for public provider endpoints',()=>{
  assert.throws(()=>createInfrastructureRecord({type:'PAYMENT_PROVIDER',name:'Pay',endpoint:'http://pay.example'}),/HTTPS_REQUIRED/)
})
