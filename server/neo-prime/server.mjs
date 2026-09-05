import http from 'node:http'
import { createNeoRouter } from '../neo-router/router.mjs'
import { createNeoPrimeRuntime } from './runtime.mjs'

const port = Number(process.env.PORT || 8080)
const host = '0.0.0.0'

const router = createNeoRouter({ providers: [] })
const prime = createNeoPrimeRuntime({ router })

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 1024 * 1024) throw new Error('request_too_large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
      const routerHealth = router.health()
      return sendJson(res, 200, {
        ok: true,
        service: 'neo-prime-runtime',
        runtime: 'cloud-run-ready',
        providersConfigured: routerHealth.configured,
        executionEnabled: false,
      })
    }

    if (req.method === 'POST' && req.url === '/v1/plan') {
      const body = await readJson(req)
      const mission = body.mission ?? body
      const cycle = body.cycle ?? 'human'
      return sendJson(res, 200, prime.plan(mission, { cycle }))
    }

    if (req.method === 'POST' && req.url === '/v1/execute') {
      return sendJson(res, 503, {
        status: 'blocked',
        reason: 'Provider execution is disabled until authenticated provider adapters and authorization are configured.',
      })
    }

    return sendJson(res, 404, { error: 'not_found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const statusCode = message === 'request_too_large' ? 413 : message.includes('JSON') ? 400 : 422
    return sendJson(res, statusCode, { error: message })
  }
})

server.listen(port, host, () => {
  console.log(`NEO Prime runtime listening on ${host}:${port}`)
})

function shutdown(signal) {
  console.log(`NEO Prime runtime received ${signal}; shutting down`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 9000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
