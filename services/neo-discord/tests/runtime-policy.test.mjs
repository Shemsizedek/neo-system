import assert from 'node:assert/strict'
import {loadPolicy,validatePolicy,healthIsAcceptable,promotionDecision} from '../deployment/evaluate-policy.mjs'

const policy=loadPolicy()
assert.deepEqual(validatePolicy(policy),[])

const healthy={ok:true,service:'neo-discord',grounded_status:true}
assert.equal(healthIsAcceptable(policy,healthy),true)
assert.equal(healthIsAcceptable(policy,{ok:false,service:'neo-discord',grounded_status:true}),false)

let decision=promotionDecision(policy,{targetAdapter:'node-http',health:healthy,parityPassed:true,explicitDispatch:true})
assert.equal(decision.allowed,false)
assert.ok(decision.reasons.includes('standby adapter is not marked deployed'))

const deployed=structuredClone(policy)
deployed.adapters['node-http'].deployed=true
decision=promotionDecision(deployed,{targetAdapter:'node-http',health:healthy,parityPassed:true,explicitDispatch:true})
assert.equal(decision.allowed,true)

decision=promotionDecision(deployed,{targetAdapter:'node-http',health:healthy,parityPassed:false,explicitDispatch:true})
assert.equal(decision.allowed,false)
assert.ok(decision.reasons.includes('adapter parity CI has not been affirmed'))

decision=promotionDecision(deployed,{targetAdapter:'node-http',health:healthy,parityPassed:true,explicitDispatch:false})
assert.equal(decision.allowed,false)
assert.ok(decision.reasons.includes('explicit workflow dispatch is required'))

decision=promotionDecision(deployed,{targetAdapter:'cloudflare-worker',health:healthy,parityPassed:true,explicitDispatch:true})
assert.equal(decision.allowed,false)
assert.ok(decision.reasons.includes('target must be the declared standby adapter'))

console.log('runtime failover policy tests passed')
