import http from 'node:http'
import { createComposioGateway } from './composio-gateway.mjs'

function respond(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(payload)
}

export function createComposioGatewayServer({ gateway = createComposioGateway(), resolveTrustedIdentity } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://neo.local')
      if (req.method === 'GET' && url.pathname === '/health') return respond(res, 200, gateway.health())
      if (req.method !== 'GET' || url.pathname !== '/api/v1/composio/tools') return respond(res, 404, { error: 'not_found' })
      if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })

      const identity = await resolveTrustedIdentity(req)
      const result = await gateway.readOnlyTools(identity)
      return respond(res, result.status === 'ok' || result.status === 'connection_required' ? 200 : 503, result)
    } catch (error) {
      const status = error?.message === 'neopass_identity_required' ? 401 : 400
      return respond(res, status, { error: status === 401 ? error.message : 'composio_read_only_request_rejected' })
    }
  })
}

export function startComposioGatewayServer({ port = Number(process.env.NEO_COMPOSIO_GATEWAY_PORT || 8798), resolveTrustedIdentity } = {}) {
  return createComposioGatewayServer({ resolveTrustedIdentity }).listen(port, '127.0.0.1')
}
