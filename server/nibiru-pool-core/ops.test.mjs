import test from 'node:test'
import assert from 'node:assert/strict'
import {loadWorldMintConfig,redactedConfig} from './opsConfig.mjs'
import {createWorldMintDiscordHandler} from './discordOperatorCommands.mjs'
import {createWorkerSecret} from './workerOnboarding.mjs'

test('ops config requires private Bitcoin RPC credentials and payout script',()=>{
  assert.throws(()=>loadWorldMintConfig({}),/WORLD_MINT_CONFIG_MISSING/)
  assert.throws(()=>loadWorldMintConfig({BITCOIN_RPC_URL:'http://10.0.0.8:8332',BITCOIN_RPC_AUTH:'u:p',WORLD_MINT_PAYOUT_SCRIPT_HEX:'0014aa'}),/REMOTE_BITCOIN_RPC_BLOCKED/)
  const cfg=loadWorldMintConfig({BITCOIN_RPC_URL:'http://127.0.0.1:8332',BITCOIN_RPC_AUTH:'u:p',WORLD_MINT_PAYOUT_SCRIPT_HEX:'0014aa'})
  assert.equal(cfg.stratumHost,'127.0.0.1')
  assert.equal(cfg.stratumPort,3333)
  assert.equal(cfg.stratumMaxConnections,128)
  assert.equal(cfg.stratumMaxLineBytes,16384)
  assert.equal(cfg.stratumIdleTimeoutMs,120000)
  assert.equal(cfg.stratumMaxSubmissionsPerWindow,64)
  assert.equal(redactedConfig(cfg).rpcAuth,'[REDACTED]')
})

test('ops config rejects unsafe malformed Stratum limit values',()=>{
  const base={BITCOIN_RPC_URL:'http://127.0.0.1:8332',BITCOIN_RPC_AUTH:'u:p',WORLD_MINT_PAYOUT_SCRIPT_HEX:'0014aa'}
  assert.throws(()=>loadWorldMintConfig({...base,NIBIRU_STRATUM_MAX_CONNECTIONS:'0'}),/NIBIRU_STRATUM_MAX_CONNECTIONS_INVALID/)
  assert.throws(()=>loadWorldMintConfig({...base,NIBIRU_STRATUM_MAX_LINE_BYTES:'64'}),/NIBIRU_STRATUM_MAX_LINE_BYTES_INVALID/)
  assert.throws(()=>loadWorldMintConfig({...base,NIBIRU_STRATUM_IDLE_TIMEOUT_MS:'99'}),/NIBIRU_STRATUM_IDLE_TIMEOUT_MS_INVALID/)
})

test('worker secret generator creates nontrivial opaque secret',()=>{
  const secret=createWorkerSecret()
  assert.ok(secret.length>=22)
  assert.equal(/\s/.test(secret),false)
})

test('Discord operator status never returns node credentials',async()=>{
  const handler=createWorldMintDiscordHandler({statusProvider:async()=>({poolId:'world-mint-genesis',running:true,ready:true,bitcoinRpcHealthy:true,chain:{blocks:900000},difficulty:'1024',job:{jobId:'wm_test'}})})
  const reply=await handler({name:'pool-status'})
  assert.equal(reply.ephemeral,true)
  assert.match(reply.content,/Ready: yes/)
  assert.doesNotMatch(reply.content,/BITCOIN_RPC_AUTH|password|secret/i)
})
