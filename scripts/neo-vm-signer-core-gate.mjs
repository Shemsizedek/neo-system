import assert from 'node:assert/strict'
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runIdentityApprovalGate } from './neo-vm-identity-core-gate.mjs'
import { createSqliteApprovalStore } from '../server/neo-vm/approval-store.mjs'
import { createExternalSigningWorkflow } from '../server/neo-vm/external-signer.mjs'
import { issueNeopassToken } from '../server/neo-platform-api/neopass-google-auth.mjs'
import { sha256Hex } from '../core/neo-bvm/runtime.mjs'
import { fixturePsbt, fixtureIntent, fixtureApproval } from './test-support/neo-vm-fixtures.mjs'
import { startFixtureSigner } from './test-support/neo-vm-signer-fixtures.mjs'

export async function runExternalSignerGate({ bitcoindPath, evidencePath } = {}) {
  const previous = await runIdentityApprovalGate({ bitcoindPath,
    afterIdentityChecks: async ({ program, plan, outpoint, reviewRpc, validationRpc, controlRpc, fundingBlock }) => {
      const directory = await mkdtemp(join(tmpdir(), 'neo-vm-external-signer-'))
      const subject = 'google:regtest-signer-operator', secret = randomBytes(48), operator = generateKeyPairSync('ed25519')
      const subjectHash = sha256Hex(Buffer.from(`neo-nvm/neopass-subject-v1\0${subject}`))
      let clock = 1_100, serial = 1_000, active = true, signerCalls = 0, afterSign, afterPolicy, fixture, store, lastOutgoing
      const cases = []
      try {
        store = createSqliteApprovalStore({ filename: join(directory, 'gateway.sqlite'), now: () => clock })
        fixture = await startFixtureSigner({ directory, operatorPublicKey: operator.publicKey, subjectHash })
        const options = { reviewRpc, validationRpc: async (method, params) => {
          const result = await validationRpc(method, params)
          if (method === 'testmempoolaccept') await afterPolicy?.()
          return result
        }, registry: { async getNEOpassCredential() { return { subject, provider: 'google', providerSubject: 'regtest-signer-operator', status: active ? 'active' : 'suspended' } } },
        jwtSecret: secret, jwtIssuer: 'neo-pass', bindings: [{ subject, approverId: 'fixture-operator', publicKey: operator.publicKey }], approvalStore: store,
        signer: { signerId: 'fixture-device', publicKey: fixture.publicKey, bitcoinPublicKeys: [plan.redeemPublicKeyHex, plan.refundPublicKeyHex], approverIds: ['fixture-operator'] },
        adapter: { async requestSignature(input) { signerCalls++; lastOutgoing = input.request; const response = await fixture.adapter.requestSignature(input); await afterSign?.(input.request); return response } }, now: () => clock, timeoutMs: 1_000 }
        const workflow = createExternalSigningWorkflow(options)
        const input = (branch = 'redeem') => {
          const request = { program, psbtBase64: fixturePsbt({ plan, outpoint, branch }), intent: fixtureIntent(plan, outpoint, branch) }
          request.approval = fixtureApproval(request, operator.privateKey, { nonce: (++serial).toString(16).padStart(64, '0') })
          return { token: issueNeopassToken({ subject, secret, now: () => 1_000_000, ttlSeconds: 200 }), request }
        }
        async function check(name, request, expectedCode, service = workflow) {
          if (expectedCode) {
            await assert.rejects(() => service.signAndValidate(request), error => error.code === expectedCode)
            cases.push({ name, passed: true, approved: false, reason: expectedCode })
          } else {
            const receipt = await service.signAndValidate(request)
            assert.equal(receipt.validation, 'FINAL_TRANSACTION_VALIDATED'); assert.equal(receipt.broadcast, false)
            cases.push({ name, passed: true, approved: true, txid: receipt.txid, wtxid: receipt.wtxid, feeSats: receipt.feeSats, mempoolAccepted: receipt.mempoolAccepted })
          }
        }
        const first = input()
        await check('separate signer process: authenticated request, operator proof, redeem signature, final Core validation', first)
        await assert.rejects(() => fixture.adapter.requestSignature({ request: lastOutgoing, signal: new AbortController().signal }), error => error.code === 'SIGNER_TRANSPORT_RESPONSE_INVALID')
        cases.push({ name: 'device independently rejects direct HTTP replay of consumed operator proof', passed: true, approved: false })
        const calls = signerCalls
        await check('durable approval replay denied before a second device call', first, 'PSBT_APPROVAL_REPLAYED'); assert.equal(signerCalls, calls)
        await check('separate signer process: mature refund signature and final Core validation', input('refund'))
        for (const [mode, expected] of [['wrong-destination', 'SIGNER_FINAL_OUTPUT_MISMATCH'], ['wrong-bitcoin-key', 'SIGNER_FINAL_CORE_REJECTED'],
          ['wrong-preimage', 'SIGNER_FINAL_WITNESS_MISMATCH'], ['wrong-device-key', 'SIGNER_RESPONSE_SIGNATURE_OR_BINDING_INVALID'],
          ['no-presence', 'SIGNER_RESPONSE_INVALID'], ['extra-field', 'INVALID_FIELDS'], ['oversized', 'SIGNER_RESPONSE_TOO_LARGE']]) {
          await fixture.configure(mode)
          await check(`malicious fixture signer: ${mode}`, input(), expected)
        }
        await fixture.configure('normal'); await check('fresh device request after negative cases remains usable', input())
        await fixture.configure('stale-response'); await check('old device attestation cannot bind a new request', input(), 'SIGNER_RESPONSE_SIGNATURE_OR_BINDING_INVALID')
        await fixture.configure('normal')
        afterSign = async () => { active = false }
        await check('identity suspension after external signature denies final result', input(), 'PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED')
        afterSign = undefined; active = true
        afterSign = async request => { clock = request.expiresAt }
        await check('request expires after external signature: deny result', input(), 'SIGNER_AUTHORIZATION_EXPIRED')
        afterSign = undefined; clock = 1_100
        afterSign = async () => { await controlRpc('invalidateblock', [fundingBlock]) }
        try { await check('real reorg removes funding UTXO after device signature', input(), 'SIGNER_FINAL_UTXO_CHANGED') }
        finally { afterSign = undefined; await controlRpc('reconsiderblock', [fundingBlock]) }
        const burn = await controlRpc('getdescriptorinfo', ['raw(0014' + '11'.repeat(20) + ')'])
        afterPolicy = async () => { await controlRpc('generatetodescriptor', [1, burn.descriptor]) }
        await check('real chain tip change after mempool test denies stale result', input(), 'SIGNER_CHAIN_CHANGED_DURING_VALIDATION')
        afterPolicy = undefined
        await fixture.configure('timeout')
        const timed = input(), timeoutWorkflow = createExternalSigningWorkflow({ ...options, timeoutMs: 100 })
        await check('HTTP signer timeout aborts request and keeps approval consumed', timed, 'SIGNER_RESPONSE_TIMEOUT', timeoutWorkflow)
        await check('timed-out approval cannot be retried', timed, 'PSBT_APPROVAL_REPLAYED', timeoutWorkflow)
        await fixture.configure('normal')
        const parallel = input(), callsBefore = signerCalls
        const results = await Promise.allSettled([workflow.signAndValidate(parallel), workflow.signAndValidate(parallel)])
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
        assert.equal(results.find(r => r.status === 'rejected').reason.code, 'PSBT_APPROVAL_REPLAYED')
        assert.equal(signerCalls - callsBefore, 1)
        cases.push({ name: 'concurrent full workflows make exactly one HTTP signing call', passed: true, successfulReviews: 1, signingCalls: 1 })
        await fixture.close()
        fixture = await startFixtureSigner({ directory, operatorPublicKey: operator.publicKey, subjectHash })
        await assert.rejects(() => fixture.adapter.requestSignature({ request: lastOutgoing, signal: new AbortController().signal }), error => error.code === 'SIGNER_TRANSPORT_RESPONSE_INVALID')
        cases.push({ name: 'device nonce history survives signer process restart and ephemeral attestation key rotation', passed: true, approved: false })
        assert.deepEqual(await controlRpc('getrawmempool', []), [])
        return { status: 'PASS', cases, transport: 'authenticated loopback HTTP to separate fixture process', signerCalls,
          gatewayStore: store.inspect(), deviceStore: 'separate SQLite WAL/FULL nonce store', fixtureKeysOnly: true,
          liveNeopassConnected: false, productionSignerConnected: false, applicationBroadcasts: 0 }
      } finally { await fixture?.close(); store?.close(); await rm(directory, { recursive: true, force: true }) }
    },
  })
  const { signerGate, ...identityRegression } = previous.identityApproval
  const report = { gate: 'NEO-VM-G6', checkedAt: previous.checkedAt, status: 'PASS', bitcoinCore: previous.bitcoinCore, isolation: previous.isolation,
    gate3Regression: previous.gate3Regression, gate4Regression: previous.gate4Regression, gate5Regression: identityRegression,
    externalSigner: signerGate, mempoolUnchanged: previous.mempoolUnchanged, productionConnected: false, applicationBroadcasts: 0 }
  if (evidencePath) await writeFile(evidencePath, JSON.stringify(report, null, 2) + '\n')
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runExternalSignerGate({ bitcoindPath: process.env.BITCOIND_PATH, evidencePath: process.env.NEO_VM_EVIDENCE })
    .then(report => process.stdout.write(JSON.stringify(report, null, 2) + '\n'))
    .catch(error => { process.stderr.write(`[neo-vm-signer-gate] ${error.message}\n`); process.exitCode = 1 })
}
