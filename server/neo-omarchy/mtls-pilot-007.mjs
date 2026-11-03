// NEO-OMARCHY-007: loopback-only TLS 1.3 mutual-auth staging transport.
// No public listener, automatic startup or production NEOpass integration.
import { createServer } from 'node:https'
import { createPublicKey, timingSafeEqual } from 'node:crypto'

const MACHINE = /^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const isLocal = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)

export function createBoundMtlsPilot({
  coordinator, trustStore, serverKeyPem, serverCertPem, clientCaPem,
} = {}) {
  if (typeof coordinator?.handleWorkerEnvelope !== 'function' ||
      typeof trustStore?.machinePublicKey !== 'function' ||
      !serverKeyPem || !serverCertPem || !clientCaPem) {
    throw new Error('staging_mtls_dependencies_required')
  }
  let busy = false
  const server = createServer({
    key: serverKeyPem, cert: serverCertPem, ca: clientCaPem,
    minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3',
    requestCert: true, rejectUnauthorized: true, honorCipherOrder: true,
  }, async (req, res) => {
    const reply = (status, value) => {
      res.writeHead(status, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      res.end(JSON.stringify(value))
    }
    if (!isLocal(req.socket?.remoteAddress) || req.socket.authorized !== true) {
      return reply(403, { error: 'client_identity_required' })
    }
    if (req.method === 'GET' && req.url === '/health') {
      return reply(200, { gate: 'NEO-OMARCHY-007', stagingOnly: true, productionReady: false })
    }
    if (req.method !== 'POST' || req.url !== '/private/v1/worker') {
      return reply(404, { error: 'not_found' })
    }
    if (req.headers['content-type'] !== 'application/json') {
      return reply(415, { error: 'invalid_content_type' })
    }
    if (busy) return reply(429, { error: 'single_worker_limit' })
    busy = true
    try {
      let size = 0
      const chunks = []
      for await (const chunk of req) {
        size += chunk.length
        if (size > 8192) return reply(413, { error: 'request_too_large' })
        chunks.push(chunk)
      }
      const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      const machineId = envelope?.payload?.machineId
      if (!MACHINE.test(machineId || '')) throw new Error('invalid_machine_identity')
      // mTLS CA membership alone is not enough: peer's *public key* must be
      // identical to the NEOpass-enrolled key in the trusted machine registry.
      const certificate = req.socket.getPeerCertificate()
      if (!Buffer.isBuffer(certificate?.pubkey)) throw new Error('missing_peer_public_key')
      const peerKey = createPublicKey({ key: certificate.pubkey, format: 'der', type: 'spki' })
      const approvedKey = await trustStore.machinePublicKey(machineId)
      if (peerKey.asymmetricKeyType !== 'ed25519' ||
          approvedKey.asymmetricKeyType !== 'ed25519') throw new Error('unsupported_machine_key')
      const peerDer = peerKey.export({ format: 'der', type: 'spki' })
      const trustedDer = approvedKey.export({ format: 'der', type: 'spki' })
      if (peerDer.length !== trustedDer.length ||
          !timingSafeEqual(peerDer, trustedDer)) throw new Error('machine_certificate_key_mismatch')
      // The coordinator independently verifies the signed application message,
      // nonce freshness and one-use database replay protection.
      return reply(200, await coordinator.handleWorkerEnvelope(envelope))
    } catch {
      return reply(403, { error: 'request_not_authorized' })
    } finally { busy = false }
  })
  server.requestTimeout = 10_000
  server.headersTimeout = 10_000
  server.maxHeadersCount = 20
  return {
    async start() {
      if (server.listening) throw new Error('already_running')
      await new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
      })
      return { host: '127.0.0.1', port: server.address().port, tls: 'TLSv1.3',
        clientCertificateRequired: true, productionReady: false }
    },
    stop: () => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())),
  }
}
