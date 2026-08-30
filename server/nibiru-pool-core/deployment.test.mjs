import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root=path.resolve(process.cwd())
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')

test('systemd unit requires live preflight before pool start',()=>{
  const unit=read('deploy/world-mint/world-mint.service')
  assert.match(unit,/ExecStartPre=\/usr\/bin\/npm run nibiru-pool:preflight/)
  assert.match(unit,/ExecStart=\/usr\/bin\/npm run nibiru-pool:start/)
  assert.ok(unit.indexOf('ExecStartPre=')<unit.indexOf('ExecStart='))
})

test('deployment example keeps health and Stratum loopback by default',()=>{
  const env=read('deploy/world-mint/world-mint.env.example')
  assert.match(env,/NIBIRU_STRATUM_HOST=127\.0\.0\.1/)
  assert.match(env,/NIBIRU_HEALTH_HOST=127\.0\.0\.1/)
  assert.match(env,/ALLOW_REMOTE_BITCOIN_RPC=false/)
})

test('deployment files contain placeholders rather than live credentials',()=>{
  const env=read('deploy/world-mint/world-mint.env.example')
  assert.match(env,/replace-with-rpc-user:replace-with-rpc-password/)
  assert.match(env,/replace-with-standard-bitcoin-scriptpubkey-hex/)
  assert.doesNotMatch(env,/BITCOIN_RPC_AUTH=[^\n]*(?:sk-|cookie=)/i)
})
