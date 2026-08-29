import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateOperatorReadEnv} from '../deployment/operator-read-preflight.mjs'

const base={
  NEO_MINER_OPERATOR_URL:'https://miner.internal.example/snapshot',
  NEO_MINER_OPERATOR_TOKEN:'miner-token',
  NEO_RELATIONS_OPERATOR_URL:'https://relations.internal.example/intents?status=pending_approval',
  NEO_RELATIONS_OPERATOR_TOKEN:'relations-token',
  DISCORD_OPERATOR_ROLE_IDS:'123456789012345678'
}

test('operator runtime preflight accepts complete role-based configuration',()=>{
  const out=evaluateOperatorReadEnv(base)
  assert.equal(out.ok,true)
  assert.deepEqual(out.configuredServices,['neo-miner','neo-relations'])
  assert.deepEqual(out.selectorModes,['role'])
})

test('operator runtime preflight accepts user selectors',()=>{
  const out=evaluateOperatorReadEnv({...base,DISCORD_OPERATOR_ROLE_IDS:'',DISCORD_OPERATOR_USER_IDS:'234567890123456789'})
  assert.equal(out.ok,true)
  assert.deepEqual(out.selectorModes,['user'])
})

test('operator runtime preflight fails closed when protected credentials are absent',()=>{
  const out=evaluateOperatorReadEnv({...base,NEO_MINER_OPERATOR_TOKEN:''})
  assert.equal(out.ok,false)
  assert.equal(out.code,'MISSING_REQUIRED_RUNTIME_VALUES')
  assert.deepEqual(out.missing,['NEO_MINER_OPERATOR_TOKEN'])
})

test('operator runtime preflight requires at least one operator selector',()=>{
  const out=evaluateOperatorReadEnv({...base,DISCORD_OPERATOR_ROLE_IDS:'',DISCORD_OPERATOR_USER_IDS:''})
  assert.equal(out.ok,false)
  assert.equal(out.code,'OPERATOR_SELECTOR_REQUIRED')
})

test('operator runtime preflight rejects malformed Discord selectors',()=>{
  const out=evaluateOperatorReadEnv({...base,DISCORD_OPERATOR_ROLE_IDS:'operators'})
  assert.equal(out.ok,false)
  assert.equal(out.code,'INVALID_DISCORD_OPERATOR_SELECTOR')
})

test('operator runtime preflight rejects Pages as protected runtime',()=>{
  const out=evaluateOperatorReadEnv({...base,NEO_MINER_OPERATOR_URL:'https://shemsizedek.github.io/neo-system/neo-miner/'})
  assert.equal(out.ok,false)
  assert.equal(out.code,'NEO_MINER_OPERATOR_URL_PAGES_RUNTIME_FORBIDDEN')
})

test('operator runtime preflight rejects recursive Discord bridge URLs',()=>{
  const out=evaluateOperatorReadEnv({...base,NEO_RELATIONS_OPERATOR_URL:'https://neo-discord-api.neosystem.workers.dev/relations'})
  assert.equal(out.ok,false)
  assert.equal(out.code,'NEO_RELATIONS_OPERATOR_URL_DISCORD_BRIDGE_RECURSION_FORBIDDEN')
})
