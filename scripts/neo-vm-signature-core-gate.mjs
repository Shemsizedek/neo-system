import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runBitcoinCoreGate } from './neo-vm-core-gate.mjs'
import { compileSignatureRefund } from '../core/neo-nvm/signature-refund.mjs'
import { authorizePsbtReview } from '../server/neo-vm/psbt-authorization.mjs'
import { createRestrictedPsbtBitcoinRpc, createRestrictedBvmBitcoinRpc } from '../server/neo-vm/shared-bitcoin-core.mjs'
import { fixtureKey, fixtureTransaction, signedFixtureSpend, fixturePsbt, fixtureIntent, fixtureApproval } from './test-support/neo-vm-fixtures.mjs'

export async function runSignatureRefundGate({ bitcoindPath, evidencePath, afterSignatureChecks } = {}) {
  const combined = await runBitcoinCoreGate({
    bitcoindPath,
    afterRegtestChecks: async ({ controlRpc, privateEndpoint }) => {
      const start = await controlRpc('getblockchaininfo', [])
      assert.equal(start.chain, 'regtest')
      const preimageHex = '01'.repeat(32)
      const program = {
        schemaVersion: 1, family: 'bitcoin', network: 'regtest', kind: 'sha256-signature-refund-v1',
        digestHex: createHash('sha256').update(Buffer.from(preimageHex, 'hex')).digest('hex'),
        redeemPublicKeyHex: fixtureKey(1).publicKeyHex,
        refundPublicKeyHex: fixtureKey(2).publicKeyHex, refundHeight: start.blocks + 105,
      }
      const plan = compileSignatureRefund(program)
      const descriptor = await controlRpc('getdescriptorinfo', [`raw(${plan.scriptPubKeyHex})`])
      const [fundingBlock] = await controlRpc('generatetodescriptor', [1, descriptor.descriptor])
      const burn = await controlRpc('getdescriptorinfo', ['raw(0014' + '11'.repeat(20) + ')'])
      await controlRpc('generatetodescriptor', [100, burn.descriptor])
      const block = await controlRpc('getblock', [fundingBlock, 2])
      const funding = block.tx[0]
      const output = funding.vout.find(v => v.scriptPubKey.hex === plan.scriptPubKeyHex)
      assert.equal(output.value, 50)
      const outpoint = { txid: funding.txid, vout: output.n }
      const contractCases = [], authorizationCases = []

      async function native(name, transaction, accepted) {
        const [policy] = await controlRpc('testmempoolaccept', [[transaction.rawHex]])
        assert.equal(policy.allowed, accepted, `${name}: ${JSON.stringify(policy)}`)
        contractCases.push({ name, passed: true, accepted: policy.allowed, rejectReason: policy['reject-reason'] ?? null, txid: policy.txid, wtxid: policy.wtxid })
      }
      const correct = signedFixtureSpend({ plan, outpoint })
      await native('redemption: correct signer and preimage', correct, true)
      await native('redemption: refund key cannot sign redeem branch', signedFixtureSpend({ plan, outpoint, keyId: 2 }), false)
      await native('redemption: wrong preimage', signedFixtureSpend({ plan, outpoint, preimageHex: '02'.repeat(32) }), false)
      await native('redemption: short preimage', signedFixtureSpend({ plan, outpoint, preimageHex: '01'.repeat(31) }), false)
      await native('redemption: missing signature', fixtureTransaction({ outpoint, witnessHex: ['', preimageHex, '01', plan.witnessScriptHex] }), false)
      const damaged = Buffer.from(correct.witnessHex[0], 'hex'); damaged[10] ^= 1
      await native('redemption: damaged signature', fixtureTransaction({ outpoint, witnessHex: [damaged.toString('hex'), preimageHex, '01', plan.witnessScriptHex] }), false)
      await native('redemption: destination changed after signature', fixtureTransaction({ outpoint, outputScriptHex: '0014' + '22'.repeat(20), witnessHex: correct.witnessHex }), false)
      await native('redemption: wrong signing-context funding amount', signedFixtureSpend({ plan, outpoint, inputSats: 4_999_999_999n }), false)
      await native('redemption: nonminimal branch selector', fixtureTransaction({ outpoint, witnessHex: [correct.witnessHex[0], preimageHex, '02', plan.witnessScriptHex] }), false)
      await native('refund: before block-height lock', signedFixtureSpend({ plan, outpoint, branch: 'refund' }), false)

      const reviewRpc = createRestrictedPsbtBitcoinRpc(privateEndpoint)
      const approvalKeys = generateKeyPairSync('ed25519')
      let serial = 0
      function requestFor({ branch = 'redeem', psbtOptions = {}, intentOverrides = {} } = {}) {
        const request = {
          program, psbtBase64: fixturePsbt({ plan, outpoint, branch, ...psbtOptions }),
          intent: fixtureIntent(plan, outpoint, branch, intentOverrides),
        }
        request.approval = fixtureApproval(request, approvalKeys.privateKey, { nonce: (++serial).toString(16).padStart(64, '0') })
        return request
      }
      function reviewer() {
        const consumed = new Set()
        return {
          consumed,
          options: {
            rpc: reviewRpc, approverId: 'fixture-operator', approverPublicKey: approvalKeys.publicKey, now: () => 1_100,
            consumeApproval: async key => { if (consumed.has(key)) return false; consumed.add(key); return true },
          },
        }
      }
      async function review(name, request, expectedCode, optionsOverride = {}) {
        const state = reviewer()
        if (expectedCode) {
          await assert.rejects(() => authorizePsbtReview(request, { ...state.options, ...optionsOverride }), error => error.code === expectedCode)
          assert.equal(state.consumed.size, 0)
          authorizationCases.push({ name, passed: true, approved: false, reason: expectedCode, nonceConsumed: false })
        } else {
          const receipt = await authorizePsbtReview(request, state.options)
          assert.equal(receipt.authorization, 'REVIEW_APPROVED')
          assert.equal(receipt.bitcoinSignatureCreated, false)
          assert.equal(receipt.broadcast, false)
          authorizationCases.push({ name, passed: true, approved: true, psbtHash: receipt.psbtHash, intentHash: receipt.intentHash, nonceConsumed: true })
        }
      }
      await review('unsigned redeem PSBT: signed one-use approval', requestFor())
      await review('refund PSBT: reject before height maturity', requestFor({ branch: 'refund' }), 'PSBT_REFUND_NOT_MATURE')
      await review('PSBT output destination differs from approved intent', requestFor({ psbtOptions: { outputScriptHex: '0014' + '22'.repeat(20) } }), 'PSBT_OUTPUT_INTENT_MISMATCH')
      await review('PSBT output amount differs from approved intent', requestFor({ psbtOptions: { amountSats: 4_999_980_000n } }), 'PSBT_OUTPUT_INTENT_MISMATCH')
      await review('PSBT witness amount differs from real Core UTXO', requestFor({ psbtOptions: { witnessAmountSats: 4_900_000_000n } }), 'PSBT_UTXO_BINDING_MISMATCH')
      await review('PSBT witnessScript differs from contract', requestFor({ psbtOptions: { witnessScriptHex: '51' } }), 'PSBT_UNSIGNED_SIGHASH_ALL_REQUIRED')
      await review('PSBT declares SIGHASH_NONE', requestFor({ psbtOptions: { sighash: 2 } }), 'PSBT_UNSIGNED_SIGHASH_ALL_REQUIRED')
      await review('PSBT already contains a partial signature', requestFor({ psbtOptions: { extraInputEntries: [['02' + plan.redeemPublicKeyHex, correct.witnessHex[0]]] } }), 'PSBT_UNSIGNED_SIGHASH_ALL_REQUIRED')
      await review('PSBT fee exceeds independently approved cap', requestFor({ intentOverrides: { maxFeeSats: '9999' } }), 'PSBT_FEE_OUT_OF_BOUNDS')
      const modified = requestFor(); modified.psbtBase64 = fixturePsbt({ plan, outpoint, amountSats: 4_999_980_000n })
      await review('PSBT bytes changed after approval signature', modified, 'PSBT_APPROVAL_SIGNATURE_INVALID')
      await review('expired operator approval', requestFor(), 'PSBT_APPROVAL_EXPIRED', { now: () => 1_200 })
      await review('wrong operator approval key', requestFor(), 'PSBT_APPROVAL_SIGNATURE_INVALID', { approverPublicKey: generateKeyPairSync('ed25519').publicKey })
      const repeated = requestFor(), state = reviewer()
      await authorizePsbtReview(repeated, state.options)
      await assert.rejects(() => authorizePsbtReview(repeated, state.options), error => error.code === 'PSBT_APPROVAL_REPLAYED')
      authorizationCases.push({ name: 'real Core PSBT approval replay', passed: true, approved: false, reason: 'PSBT_APPROVAL_REPLAYED' })

      const current = await controlRpc('getblockchaininfo', [])
      await controlRpc('generatetodescriptor', [plan.refundHeight - current.blocks, burn.descriptor])
      await native('refund: correct key after block-height lock', signedFixtureSpend({ plan, outpoint, branch: 'refund' }), true)
      await native('refund: redeem key cannot sign refund branch', signedFixtureSpend({ plan, outpoint, branch: 'refund', keyId: 1 }), false)
      await native('refund: transaction locktime below script requirement', signedFixtureSpend({ plan, outpoint, branch: 'refund', lockTime: plan.refundHeight - 1 }), false)
      await native('refund: final sequence cannot bypass CLTV', signedFixtureSpend({ plan, outpoint, branch: 'refund', sequence: 0xffffffff }), false)
      await native('redeem branch remains valid after refund height', signedFixtureSpend({ plan, outpoint }), true)
      await review('unsigned refund PSBT: correct key policy and mature height', requestFor({ branch: 'refund' }))
      // Trusted test extension on the owned node only. Application modules do
      // not receive control RPC, credentials or a callback execution endpoint.
      const identityGate = afterSignatureChecks ? await afterSignatureChecks({ program, plan, outpoint, reviewRpc,
        validationRpc: createRestrictedBvmBitcoinRpc(privateEndpoint), controlRpc, fundingBlock }) : null
      assert.deepEqual(await controlRpc('getrawmempool', []), [])
      return { status: 'PASS', contractProfile: plan.kind, contractCases, authorizationCases, identityGate, fixtureSigningOnly: true, liveNeopassConnected: false, approvalStore: 'isolated test-only atomic Set' }
    },
  })
  const report = {
    gate: 'NEO-VM-G4', checkedAt: combined.checkedAt, status: 'PASS',
    bitcoinCore: combined.bitcoinCore, isolation: combined.isolation,
    gate3Regression: { passed: combined.cases.length, cases: combined.cases },
    ...combined.additionalGate, mempoolUnchanged: combined.mempoolUnchanged,
    productionConnected: false, applicationBroadcasts: 0,
  }
  if (evidencePath) await writeFile(evidencePath, JSON.stringify(report, null, 2) + '\n')
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSignatureRefundGate({ bitcoindPath: process.env.BITCOIND_PATH, evidencePath: process.env.NEO_VM_EVIDENCE })
    .then(report => process.stdout.write(JSON.stringify(report, null, 2) + '\n'))
    .catch(error => { process.stderr.write(`[neo-vm-signature-gate] ${error.message}\n`); process.exitCode = 1 })
}
