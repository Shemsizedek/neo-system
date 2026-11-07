import { VmInputError } from '../../core/neo-bvm/input.mjs'
import { canonicalSignerRequest } from './signer-protocol.mjs'
import { canonicalPairingChallenge } from './pairing-protocol.mjs'
import { normalizeSignerEndpoint } from './signer-endpoint.mjs'

const fail = code => { throw new VmInputError(code) }
const MAX_RESPONSE_BYTES = 140_000

/** Explicitly configured endpoint only. No discovery, redirects, cookies or retries. */
export function createExternalSignerClient({ url, authenticationToken, fetchImpl = globalThis.fetch } = {}) {
  const endpoint = new URL(normalizeSignerEndpoint(url))
  if (typeof authenticationToken !== 'string' || !/^[A-Za-z0-9_-]{32,512}$/.test(authenticationToken) || typeof fetchImpl !== 'function') fail('SIGNER_TRANSPORT_AUTH_REQUIRED')
  const address = endpoint.href, credential = authenticationToken
  async function post(address, value, signal) {
      const body = JSON.stringify(value)
      if (Buffer.byteLength(body) > 100_000 || !(signal instanceof AbortSignal)) fail('SIGNER_TRANSPORT_REQUEST_INVALID')
      let response
      try {
        response = await fetchImpl(address, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${credential}` },
          body, signal, redirect: 'error', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' })
        if (response.status !== 200 || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '') ||
            Number(response.headers.get('content-length') || 0) > MAX_RESPONSE_BYTES || !response.body?.getReader) {
          await response.body?.cancel(); fail('SIGNER_TRANSPORT_RESPONSE_INVALID')
        }
        const reader = response.body.getReader(), chunks = []
        let size = 0
        try {
          while (true) {
            const part = await reader.read()
            if (part.done) break
            size += part.value.byteLength
            if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); fail('SIGNER_RESPONSE_TOO_LARGE') }
            chunks.push(Buffer.from(part.value))
          }
        } finally { reader.releaseLock() }
        try { return JSON.parse(Buffer.concat(chunks, size).toString('utf8')) }
        catch { fail('SIGNER_TRANSPORT_RESPONSE_INVALID') }
      } catch (error) {
        if (error instanceof VmInputError) throw error
        fail('SIGNER_TRANSPORT_UNAVAILABLE')
      }
  }
  return Object.freeze({
    requestSignature: ({request,signal}) => post(address,canonicalSignerRequest(request),signal),
    requestPairingProof: ({challenge,signal}) => post(new URL('/v1/neo-vm/pair',address).href,canonicalPairingChallenge(challenge),signal),
  })
}
