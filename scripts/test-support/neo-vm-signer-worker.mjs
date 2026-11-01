// TEST ONLY. This process is not a device adapter or a production signer service.
// BTC private scalars 1/2/3 are public fixtures. Never fund them with real BTC.
import { createServer } from 'node:http'
import { createPublicKey, generateKeyPairSync, timingSafeEqual } from 'node:crypto'
import { join } from 'node:path'
import { compileSignatureRefund } from '../../core/neo-nvm/signature-refund.mjs'
import { verifySignerOperatorApproval } from '../../server/neo-vm/signer-protocol.mjs'
import { createSqliteApprovalStore } from '../../server/neo-vm/approval-store.mjs'
import { fixtureKey, signedFixtureSpend } from './neo-vm-fixtures.mjs'
import { fixtureSignerResponse } from './neo-vm-signer-fixtures.mjs'

process.once('message', configuration => {
  const keys = generateKeyPairSync('ed25519'), operatorKey = createPublicKey(configuration.operatorPublicKey)
  const store = createSqliteApprovalStore({ filename: join(configuration.directory, 'fixture-device.sqlite'), now: () => 1_100 })
  let mode = 'normal', cached
  const server = createServer(async (incoming, outgoing) => {
    const send = (status, value) => { outgoing.writeHead(status, { 'content-type': 'application/json' }); outgoing.end(JSON.stringify(value)) }
    try {
      const auth = Buffer.from(incoming.headers.authorization || ''), expected = Buffer.from('Bearer ' + configuration.authenticationToken)
      if (incoming.method !== 'POST' || incoming.url !== '/v1/neo-vm/sign' || auth.length !== expected.length || !timingSafeEqual(auth, expected)) return send(403, { error: 'fixture_forbidden' })
      const chunks = []; let size = 0
      for await (const chunk of incoming) { size += chunk.length; if (size > 100_000) return send(413, { error: 'fixture_size' }); chunks.push(chunk) }
      const request = verifySignerOperatorApproval(JSON.parse(Buffer.concat(chunks).toString()), operatorKey)
      const plan = compileSignatureRefund(request.program), branch = request.intent.branch, keyId = branch === 'redeem' ? 1 : 2
      if (request.signerId !== 'fixture-device' || request.approval.authorizerId !== 'fixture-operator' ||
          request.neopassSubjectHash !== configuration.subjectHash || request.issuedAt > 1_100 || request.expiresAt <= 1_100 ||
          (branch === 'redeem' ? plan.redeemPublicKeyHex : plan.refundPublicKeyHex) !== fixtureKey(keyId).publicKeyHex) return send(403, { error: 'fixture_request_denied' })
      const nonceKey = `neo-nvm/psbt-approval-v1:${request.approval.authorizerId}:${request.approval.nonce}`
      if (!store.consumeApproval(nonceKey, request.approval.expiresAt, { subjectHash: request.neopassSubjectHash,
        approvalKeyHash: request.approvalKeyHash, psbtHash: request.psbtHash, intentHash: request.intentHash })) return send(409, { error: 'fixture_replay' })
      if (mode === 'timeout') return // Deliberate ambiguous result: reservation remains consumed.
      if (mode === 'oversized') { outgoing.writeHead(200, { 'content-type': 'application/json' }); return outgoing.end('x'.repeat(140_001)) }
      const transaction = signedFixtureSpend({ plan, outpoint: request.intent.outpoint, branch,
        amountSats: BigInt(request.intent.outputs[0].valueSats), outputScriptHex: mode === 'wrong-destination' ? '0014' + '22'.repeat(20) : request.intent.outputs[0].scriptPubKeyHex,
        keyId: mode === 'wrong-bitcoin-key' ? 3 : keyId, preimageHex: mode === 'wrong-preimage' ? '02'.repeat(32) : '01'.repeat(32) })
      const response = fixtureSignerResponse(request, mode === 'wrong-device-key' ? generateKeyPairSync('ed25519').privateKey : keys.privateKey, transaction.rawHex)
      if (mode === 'stale-response' && cached) return send(200, cached)
      if (mode === 'no-presence') response.userPresenceAttested = false
      if (mode === 'extra-field') response.private_key = 'PUBLIC_TEST_MARKER'
      cached = response
      send(200, response)
    } catch { send(400, { error: 'fixture_invalid_request' }) }
  })
  server.listen(0, '127.0.0.1', () => process.send({ url: `http://127.0.0.1:${server.address().port}/v1/neo-vm/sign`, publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }) }))
  process.on('message', ({ id, mode: next }) => { mode = next; process.send({ id, configured: true }) })
  const stop = () => { server.closeAllConnections(); server.close(() => { store.close(); process.exit(0) }) }
  process.once('SIGTERM', stop); process.once('disconnect', stop)
})
