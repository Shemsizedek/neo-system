// TEST ONLY. Disposable Ed25519 proof keys and publicly known regtest BTC keys.
import { createPublicKey, randomBytes, sign } from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { signerRequestHash, signerResponseChallenge } from '../../server/neo-vm/signer-protocol.mjs'
import { createExternalSignerClient } from '../../server/neo-vm/signer-transport.mjs'

export function fixtureSignerResponse(request, privateKey, rawTransactionHex) {
  const unsigned = { version: 1, network: 'regtest', requestId: request.requestId, signerId: request.signerId,
    requestHash: signerRequestHash(request), expiresAt: request.expiresAt, userPresenceAttested: true, rawTransactionHex }
  return { ...unsigned, signatureHex: sign(null, signerResponseChallenge(unsigned), privateKey).toString('hex') }
}

export async function startFixtureSigner({ directory, operatorPublicKey, subjectHash }) {
  const child = spawn(process.execPath, [fileURLToPath(new URL('./neo-vm-signer-worker.mjs', import.meta.url))], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] })
  const authenticationToken = randomBytes(32).toString('base64url')
  let stderr = '', sequence = 0, closed = false
  child.stderr.on('data', data => { stderr += data })
  const startup = once(child, 'message'), stopped = once(child, 'exit')
  child.send({ directory, authenticationToken, operatorPublicKey: operatorPublicKey.export({ type: 'spki', format: 'pem' }), subjectHash })
  let timer
  const ready = await Promise.race([startup.then(([value]) => value), stopped.then(() => { throw Error(`fixture signer exited: ${stderr}`) }),
    new Promise((_, reject) => { timer = setTimeout(() => { child.kill('SIGKILL'); reject(Error('fixture signer startup timeout')) }, 5_000) })]).finally(() => clearTimeout(timer))
  return {
    adapter: createExternalSignerClient({ url: ready.url, authenticationToken }), publicKey: createPublicKey(ready.publicKey),
    async configure(mode) {
      const id = ++sequence, result = once(child, 'message'); child.send({ id, mode })
      const [reply] = await result
      if (reply.id !== id || !reply.configured) throw Error('fixture signer configuration failed')
    },
    async close() {
      if (closed) return; closed = true
      if (child.exitCode === null) { child.kill('SIGTERM'); const kill = setTimeout(() => child.kill('SIGKILL'), 2_000); await stopped; clearTimeout(kill) }
    },
  }
}
