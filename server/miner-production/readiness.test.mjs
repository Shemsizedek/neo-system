import test from 'node:test'
import assert from 'node:assert/strict'
import {assertLiveContractActivation,evaluateProductionReadiness} from './readiness.mjs'

const liveConfig={
  bitcoin:{enabled:true,rpcUrl:'http://127.0.0.1:8332',secretRef:'secret://bitcoin-rpc'},
  counterparty:{enabled:true,apiUrl:'https://counterparty.example/api/v2'},
  pool:{enabled:true,endpoint:'stratum+ssl://pool.example:3333'},
  miners:{enabled:true,verifiedAgentCount:2},
  fx:{enabled:true,apiUrl:'https://fx.example/latest',source:'PROVIDER'},
  payments:{enabled:true,provider:'PROVIDER',secretRef:'secret://payments',webhookSignatureVerification:true},
  storage:{contracts:'PERSISTENT',settlements:'PERSISTENT'},
  compliance:{enabled:true,activationPolicy:'FAIL_CLOSED'}
}

test('production readiness only becomes LIVE when every hard gate passes',()=>{
  const result=evaluateProductionReadiness(liveConfig)
  assert.equal(result.ready,true)
  assert.equal(result.mode,'LIVE')
  assert.deepEqual(result.missing,[])
})

test('production readiness fails closed when payment gateway is missing',()=>{
  const config=structuredClone(liveConfig)
  config.payments.enabled=false
  const result=evaluateProductionReadiness(config)
  assert.equal(result.ready,false)
  assert.ok(result.missing.includes('payment_gateway'))
})

test('cloud mining activation rejects simulation and unbacked capacity',()=>{
  assert.throws(()=>assertLiveContractActivation({productionReady:true,paymentConfirmed:true,contractExecuted:true,capacityBacked:false,customerSettlementDestinationVerified:true,simulation:false}))
  assert.throws(()=>assertLiveContractActivation({productionReady:true,paymentConfirmed:true,contractExecuted:true,capacityBacked:true,customerSettlementDestinationVerified:true,simulation:true}))
})

test('cloud mining activation succeeds only after every gate passes',()=>{
  const activation=assertLiveContractActivation({productionReady:true,paymentConfirmed:true,contractExecuted:true,capacityBacked:true,customerSettlementDestinationVerified:true,simulation:false,orderId:'ORD-1',contractId:'NMC-1'})
  assert.equal(activation.state,'ACTIVE')
  assert.equal(activation.contractId,'NMC-1')
})
