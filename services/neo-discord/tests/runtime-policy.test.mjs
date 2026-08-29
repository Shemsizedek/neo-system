import assert from 'node:assert/strict'
import {loadPolicy,validatePolicy} from '../deployment/evaluate-policy.mjs'

const policy=loadPolicy()
assert.deepEqual(validatePolicy(policy),[])
assert.equal(policy.sourceOfTruth,'github')
assert.equal(policy.frontendPlane,'github-pages')
assert.equal(policy.serverApiPlane,'discord')
assert.equal(policy.rules.transportBridgeMayBecomeBackend,false)
assert.equal(policy.rules.automaticTransportPromotion,false)
assert.equal(policy.transportBridges['cloudflare-worker'].ownsBusinessLogic,false)
assert.equal(policy.transportBridges['node-http'].ownsBusinessLogic,false)

const invalid=structuredClone(policy)
invalid.serverApiPlane='cloudflare'
assert.ok(validatePolicy(invalid).includes('serverApiPlane must be discord'))

const elevated=structuredClone(policy)
elevated.transportBridges['cloudflare-worker'].ownsBusinessLogic=true
assert.ok(validatePolicy(elevated).some(x=>x.includes('may not own NEO business logic')))

console.log('NEO three-plane runtime policy tests passed')
