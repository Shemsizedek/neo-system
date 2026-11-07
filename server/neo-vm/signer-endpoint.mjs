import { VmInputError } from '../../core/neo-bvm/input.mjs'

export function normalizeSignerEndpoint(url) {
  let endpoint
  try { endpoint = new URL(url) } catch { throw new VmInputError('SIGNER_ENDPOINT_REQUIRED') }
  if ((endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['127.0.0.1','[::1]','localhost'].includes(endpoint.hostname))) ||
      endpoint.pathname !== '/v1/neo-vm/sign' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new VmInputError('SIGNER_ENDPOINT_INVALID')
  return endpoint.href
}
