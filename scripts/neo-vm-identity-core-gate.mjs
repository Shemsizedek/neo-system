import assert from 'node:assert/strict'
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSignatureRefundGate } from './neo-vm-signature-core-gate.mjs'
import { createSqliteApprovalStore } from '../server/neo-vm/approval-store.mjs'
import { createNeopassPsbtReviewer } from '../server/neo-vm/neopass-psbt-review.mjs'
import { issueNeopassToken } from '../server/neo-platform-api/neopass-google-auth.mjs'
import { fixturePsbt, fixtureIntent, fixtureApproval } from './test-support/neo-vm-fixtures.mjs'

export async function runIdentityApprovalGate({ bitcoindPath, evidencePath, afterIdentityChecks } = {}) {
  const previous = await runSignatureRefundGate({ bitcoindPath,
    afterSignatureChecks: async context => {
      const { program, plan, outpoint, reviewRpc } = context
      const directory = await mkdtemp(join(tmpdir(), 'neo-vm-core-identity-')), stores = []
      const subject = 'google:regtest-operator', secret = randomBytes(48), keys = generateKeyPairSync('ed25519')
      let clock = 1_100, serial = 100, registryReads = 0, coreCalls = 0, registryUnavailable = false, onRegistry, onRpc
      const record = { subject, provider: 'google', providerSubject: 'regtest-operator', status: 'active', role: 'member' }
      const cases = []
      const open = () => { const store = createSqliteApprovalStore({ filename: join(directory, 'approvals.sqlite'), now: () => clock }); stores.push(store); return store }
      const registry = { async getNEOpassCredential() {
        registryReads++; onRegistry?.(registryReads)
        if (registryUnavailable) throw Error('fixture registry unavailable')
        return record
      } }
      const rpc = async (method, params) => { coreCalls++; const result = await reviewRpc(method, params); onRpc?.(method); return result }
      const token = (overrides = {}) => issueNeopassToken({ subject, secret, issuer: 'neo-pass', now: () => 1_000_000, ttlSeconds: 200, ...overrides })
      const makeRequest = () => {
        const request = { program, psbtBase64: fixturePsbt({ plan, outpoint }), intent: fixtureIntent(plan, outpoint) }
        request.approval = fixtureApproval(request, keys.privateKey, { nonce: (++serial).toString(16).padStart(64, '0') })
        return request
      }
      let store = open()
      const reviewer = (activeStore = store) => createNeopassPsbtReviewer({ rpc, registry, jwtSecret: secret, jwtIssuer: 'neo-pass',
        bindings: [{ subject, approverId: 'fixture-operator', publicKey: keys.publicKey }], approvalStore: activeStore, now: () => clock })
      async function check(name, input, expectedCode, service = reviewer()) {
        if (expectedCode) {
          await assert.rejects(() => service.review(input), error => error.code === expectedCode)
          cases.push({ name, passed: true, approved: false, reason: expectedCode })
        } else {
          const receipt = await service.review(input)
          assert.equal(receipt.authorization, 'REVIEW_APPROVED')
          assert.equal(receipt.bitcoinSignatureCreated, false); assert.equal(receipt.broadcast, false)
          assert.equal(receipt.approvalStore, 'sqlite')
          cases.push({ name, passed: true, approved: true, psbtHash: receipt.psbtHash, intentHash: receipt.intentHash, nonceConsumed: true })
        }
      }
      try {
        const input = { token: token(), request: makeRequest() }
        await check('real Core review with verified fixture NEOpass session and pinned approval key', input)
        store.close(); store = open()
        await check('same approval denied after closing and reopening SQLite and reviewer', input, 'PSBT_APPROVAL_REPLAYED')
        record.status = 'suspended'
        const callsBeforeDenials = coreCalls
        await check('signed executive role cannot override suspended registry membership', { token: token({ claims: { role: 'executive-admin' } }), request: makeRequest() }, 'PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED')
        record.status = 'active'
        await check('valid but unbound NEOpass subject cannot use another approval key', { token: token({ subject: 'google:another-person' }), request: makeRequest() }, 'PSBT_NEOPASS_APPROVER_NOT_BOUND')
        await check('browser oracle token cannot authorize PSBT review', { token: token({ claims: { token_use: 'browser', scope: 'neo:oracle:execute' } }), request: makeRequest() }, 'PSBT_NEOPASS_SESSION_INVALID')
        registryUnavailable = true
        await check('unavailable authoritative registry grants no fallback', { token: token(), request: makeRequest() }, 'PSBT_NEOPASS_REGISTRY_UNAVAILABLE')
        registryUnavailable = false
        const forged = makeRequest(); forged.approval = fixtureApproval(forged, generateKeyPairSync('ed25519').privateKey)
        await check('valid NEOpass session cannot replace pinned Ed25519 proof', { token: token(), request: forged }, 'PSBT_APPROVAL_SIGNATURE_INVALID')
        assert.equal(coreCalls, callsBeforeDenials)
        const beforeRevocation = store.inspect().consumedApprovals
        onRpc = method => { if (method === 'gettxout') record.status = 'suspended' }
        await check('registry suspension during real Core I/O denies before reservation', { token: token(), request: makeRequest() }, 'PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED')
        assert.equal(store.inspect().consumedApprovals, beforeRevocation)
        onRpc = undefined; record.status = 'active'
        onRpc = method => { if (method === 'gettxout') clock = 1_101 }
        await check('NEOpass session expiring during real Core I/O denies review', { token: token({ ttlSeconds: 101 }), request: makeRequest() }, 'PSBT_NEOPASS_SESSION_INVALID')
        onRpc = undefined; clock = 1_100
        const parallel = { token: token(), request: makeRequest() }, secondStore = open()
        const results = await Promise.allSettled([reviewer().review(parallel), reviewer(secondStore).review(parallel)])
        assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
        assert.equal(results.find(result => result.status === 'rejected').reason.code, 'PSBT_APPROVAL_REPLAYED')
        cases.push({ name: 'two real Core reviewers sharing SQLite produce one approval', passed: true, successfulReviews: 1, rejectedReplays: 1 })
        const burned = { token: token(), request: makeRequest() }, reads = registryReads
        onRegistry = read => { if (read === reads + 3) record.status = 'suspended' }
        await check('revocation after durable reservation denies review and burns nonce', burned, 'PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED')
        onRegistry = undefined; record.status = 'active'
        await check('burned nonce remains denied after identity reactivation', burned, 'PSBT_APPROVAL_REPLAYED')
        const closedStore = open(), closedReviewer = reviewer(closedStore); closedStore.close()
        await check('closed durable store grants no approval', { token: token(), request: makeRequest() }, 'PSBT_APPROVAL_STORE_CLOSED', closedReviewer)
        const signerGate = afterIdentityChecks ? await afterIdentityChecks(context) : null
        return { status: 'PASS', cases, store: store.inspect(), coreCalls, registryReads, signerGate,
          fixtureIdentityOnly: true, liveNeopassConnected: false, externalSignerConnected: false }
      } finally { for (const current of stores) current.close(); await rm(directory, { recursive: true, force: true }) }
    },
  })
  const report = {
    gate: 'NEO-VM-G5', checkedAt: previous.checkedAt, status: 'PASS', bitcoinCore: previous.bitcoinCore, isolation: previous.isolation,
    gate3Regression: previous.gate3Regression,
    gate4Regression: { contractCases: previous.contractCases, authorizationCases: previous.authorizationCases },
    identityApproval: previous.identityGate, mempoolUnchanged: previous.mempoolUnchanged,
    productionConnected: false, applicationBroadcasts: 0,
  }
  if (evidencePath) await writeFile(evidencePath, JSON.stringify(report, null, 2) + '\n')
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runIdentityApprovalGate({ bitcoindPath: process.env.BITCOIND_PATH, evidencePath: process.env.NEO_VM_EVIDENCE })
    .then(report => process.stdout.write(JSON.stringify(report, null, 2) + '\n'))
    .catch(error => { process.stderr.write(`[neo-vm-identity-gate] ${error.message}\n`); process.exitCode = 1 })
}
