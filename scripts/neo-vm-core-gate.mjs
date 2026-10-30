import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { bitcoinRpcClient } from '../server/miner-production/bitcoinWallet.mjs'
import { createRestrictedBvmBitcoinRpc } from '../server/neo-vm/shared-bitcoin-core.mjs'
import { compileNvm, digestPreimage } from '../server/neo-vm/nvm.mjs'
import { verifyBvmRegtest } from '../server/neo-vm/bvm-regtest.mjs'
import { evaluateP2wsh } from '../core/neo-bvm/runtime.mjs'

// Test infrastructure only. It spawns its OWN network-disabled regtest node.
// Fixture mining/reorg RPCs never enter the application RPC allowlist.
function uint32(value) { const b = Buffer.alloc(4); b.writeUInt32LE(value); return b }
function compactSize(value) {
  if (value < 253) return Buffer.from([value])
  const b = Buffer.alloc(3); b[0] = 253; b.writeUInt16LE(value, 1); return b
}
function vector(hex) { const b = Buffer.from(hex, 'hex'); return Buffer.concat([compactSize(b.length), b]) }
function spendingTransaction(outpoint, witnessHex, valueSats) {
  const amount = Buffer.alloc(8); amount.writeBigUInt64LE(valueSats)
  return Buffer.concat([
    uint32(2), Buffer.from('000101', 'hex'),
    Buffer.from(outpoint.txid, 'hex').reverse(), uint32(outpoint.vout),
    Buffer.from([0]), uint32(0xfffffffd), Buffer.from([1]), amount,
    vector('0014' + '11'.repeat(20)), compactSize(witnessHex.length),
    ...witnessHex.map(vector), uint32(0),
  ]).toString('hex')
}
async function unusedPort() {
  const server = createServer()
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok) })
  const port = server.address().port
  await new Promise(ok => server.close(ok))
  return port
}

export async function runBitcoinCoreGate({ bitcoindPath, evidencePath } = {}) {
  if (!bitcoindPath || !isAbsolute(bitcoindPath)) throw new Error('ABSOLUTE_VERIFIED_BITCOIND_PATH_REQUIRED')
  const binarySha256 = createHash('sha256').update(await readFile(bitcoindPath)).digest('hex')
  const directory = await mkdtemp(join(tmpdir(), 'neo-bvm-regtest-'))
  const port = await unusedPort()
  const child = spawn(bitcoindPath, [
    '-regtest=1', '-server=1', '-disablewallet=1', '-listen=0', '-dnsseed=0',
    '-discover=0', '-networkactive=0', '-persistmempool=0',
    '-rpcbind=127.0.0.1', '-rpcallowip=127.0.0.1', `-rpcport=${port}`,
    `-datadir=${directory}`, '-printtoconsole=0',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  let startupError = ''
  let spawnError
  child.stderr.on('data', chunk => { startupError = (startupError + chunk).slice(-2_000) })
  child.on('error', error => { spawnError = error })
  let controlRpc
  let applicationRpc
  try {
    let ready = false
    for (let attempt = 0; attempt < 200; attempt++) {
      if (spawnError || child.exitCode !== null) throw new Error(`REGTEST_NODE_START_FAILED: ${startupError || spawnError?.message}`)
      try {
        const auth = (await readFile(join(directory, 'regtest/.cookie'), 'utf8')).trim()
        const url = `http://127.0.0.1:${port}/`
        controlRpc = bitcoinRpcClient({ url, auth, timeoutMs: 2_000 })
        const chain = await controlRpc('getblockchaininfo', [])
        assert.equal(chain.chain, 'regtest')
        applicationRpc = createRestrictedBvmBitcoinRpc({ url, auth })
        ready = true
        break
      } catch { await delay(50) }
    }
    if (!ready) throw new Error('REGTEST_NODE_START_TIMEOUT')
    const network = await controlRpc('getnetworkinfo', [])
    assert.equal(network.version, 310100, 'This gate pins Bitcoin Core 31.1')
    assert.equal(network.networkactive, false)
    assert.equal(network.connections, 0)
    const cases = []
    const preimage = Buffer.alloc(32, 1) // Public, disposable fixture data.
    const digest = digestPreimage(preimage)
    const program = kind => ({ version: 1, network: 'bitcoin-regtest', contract: { kind, digest } })
    const loose = program('sha256-preimage')
    const strict = program('sha256-preimage-32')
    const plans = [compileNvm(loose), compileNvm(strict)]
    const fundingBlocks = []
    for (const plan of plans) {
      const info = await controlRpc('getdescriptorinfo', [`raw(${plan.scriptPubKey})`])
      fundingBlocks.push((await controlRpc('generatetodescriptor', [1, info.descriptor]))[0])
    }
    const descriptor = await controlRpc('getdescriptorinfo', ['raw(0014' + '11'.repeat(20) + ')'])
    await controlRpc('generatetodescriptor', [100, descriptor.descriptor])
    const initialMempool = await controlRpc('getrawmempool', [])
    assert.deepEqual(initialMempool, [])
    const outpoints = []
    for (let i = 0; i < plans.length; i++) {
      const block = await controlRpc('getblock', [fundingBlocks[i], 2])
      const coinbase = block.tx[0]
      const output = coinbase.vout.find(v => v.scriptPubKey.hex === plans[i].scriptPubKey)
      assert.ok(output)
      outpoints.push({ txid: coinbase.txid, vout: output.n })
    }
    const valueSats = 5_000_000_000n - 10_000n
    async function check(name, { index = 0, witnessHex, outputSats = valueSats, accepted, localAccepted = accepted, adapterError } = {}) {
      const plan = plans[index]
      const currentProgram = index ? strict : loose
      const witness = witnessHex ?? [preimage.toString('hex'), plan.witnessScript]
      const raw = spendingTransaction(outpoints[index], witness, outputSats)
      const [native] = await controlRpc('testmempoolaccept', [[raw]])
      assert.equal(native.allowed, accepted, `${name}: native Core result: ${JSON.stringify(native)}`)
      const local = evaluateP2wsh({ network: 'regtest', scriptPubKeyHex: plan.scriptPubKey, witnessHex: witness })
      assert.equal(local.status === 'LOCAL_ACCEPT', localAccepted, `${name}: local Script result`)
      if (adapterError) {
        await assert.rejects(() => verifyBvmRegtest({ rpc: applicationRpc, program: currentProgram, outpoint: outpoints[index], rawTransactionHex: raw }), adapterError)
      } else {
        const adapter = await verifyBvmRegtest({ rpc: applicationRpc, program: currentProgram, outpoint: outpoints[index], rawTransactionHex: raw })
        assert.equal(adapter.mempoolAccepted, accepted)
        assert.equal(adapter.broadcast, false)
        assert.equal(adapter.localScriptAccepted, localAccepted)
        assert.equal(adapter.txid, native.txid)
        assert.equal(adapter.wtxid, native.wtxid)
      }
      cases.push({ name, passed: true, coreAccepted: native.allowed, localScriptAccepted: local.status === 'LOCAL_ACCEPT', adapterBoundary: adapterError ? 'REJECTED_BEFORE_POLICY' : 'CORE_POLICY_RESULT', rejectReason: native['reject-reason'] ?? null, txid: native.txid, wtxid: native.wtxid })
    }
    await check('variable-length hashlock: correct preimage', { accepted: true })
    await check('fixed-32-byte hashlock: correct preimage', { index: 1, accepted: true })
    await check('wrong preimage', { witnessHex: ['02'.repeat(32), plans[0].witnessScript], accepted: false })
    await check('fixed-length contract: 31-byte preimage', { index: 1, witnessHex: ['01'.repeat(31), plans[1].witnessScript], accepted: false })
    await check('altered witnessScript commitment', { witnessHex: [preimage.toString('hex'), '51'], accepted: false, adapterError: /BVM_WITNESS_BINDING_INVALID/ })
    await check('extra witness stack item', { witnessHex: ['01', preimage.toString('hex'), plans[0].witnessScript], accepted: false, adapterError: /BVM_WITNESS_BINDING_INVALID/ })
    await check('521-byte witness element', { witnessHex: ['01'.repeat(521), plans[0].witnessScript], accepted: false })
    await check('zero fee: policy rejection with valid Script', { outputSats: 5_000_000_000n, accepted: false, localAccepted: true })
    await check('negative transaction fee', { outputSats: 5_000_000_001n, accepted: false, localAccepted: true, adapterError: /BVM_FEE_OUT_OF_BOUNDS/ })
    await check('fee exceeds NEO cap despite Core acceptance', { outputSats: 5_000_000_000n - 1_000_000n, accepted: true, localAccepted: true, adapterError: /BVM_FEE_OUT_OF_BOUNDS/ })
    await check('Core maximum fee-rate rejection', { outputSats: 5_000_000_000n - 2_000_000n, accepted: false, localAccepted: true, adapterError: /BVM_FEE_OUT_OF_BOUNDS/ })

    // A reorg must invalidate previous UTXO evidence; the application rechecks it.
    await controlRpc('invalidateblock', [fundingBlocks[0]])
    const raw = spendingTransaction(outpoints[0], [preimage.toString('hex'), plans[0].witnessScript], valueSats)
    await assert.rejects(() => verifyBvmRegtest({ rpc: applicationRpc, program: loose, outpoint: outpoints[0], rawTransactionHex: raw }), /BVM_PREVOUT_SCRIPT_MISMATCH/)
    cases.push({ name: 'reorg removes funding UTXO', passed: true, adapterRejected: true })
    await controlRpc('reconsiderblock', [fundingBlocks[0]])
    await check('reorg recovery restores independently checked UTXO', { accepted: true })
    assert.deepEqual(await controlRpc('getrawmempool', []), initialMempool)
    const report = {
      gate: 'NEO-VM-G3', checkedAt: new Date().toISOString(), status: 'PASS',
      bitcoinCore: { version: network.version, subversion: network.subversion, binarySha256 },
      isolation: { chain: 'regtest', freshDataDirectory: true, networkActive: false, peerConnections: 0, walletDisabled: true },
      validation: 'independent local Script evaluation and Bitcoin Core mempool policy checks',
      applicationRpc: 'existing NEO Bitcoin Core client with five-method read-only allowlist',
      cases, mempoolUnchanged: true, productionConnected: false, applicationBroadcasts: 0,
    }
    if (evidencePath) await writeFile(evidencePath, JSON.stringify(report, null, 2) + '\n')
    return report
  } finally {
    if (child.pid && child.exitCode === null) {
      try { if (controlRpc) await controlRpc('stop', []) } catch { child.kill('SIGTERM') }
      if (!controlRpc) child.kill('SIGTERM')
      const timer = setTimeout(() => child.kill('SIGKILL'), 5_000)
      timer.unref()
      if (child.exitCode === null) await new Promise(ok => child.once('exit', ok))
      clearTimeout(timer)
    }
    await rm(directory, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runBitcoinCoreGate({ bitcoindPath: process.env.BITCOIND_PATH, evidencePath: process.env.NEO_VM_EVIDENCE })
    .then(report => process.stdout.write(JSON.stringify(report, null, 2) + '\n'))
    .catch(error => { process.stderr.write(`[neo-vm-core-gate] ${error.message}\n`); process.exitCode = 1 })
}
