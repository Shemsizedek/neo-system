import { createNeoRouter, providersFromEnv } from '../server/neo-router/index.mjs'

const router = createNeoRouter({ providers: providersFromEnv(process.env) })
const health = router.health()

console.log(JSON.stringify({
  service: 'neo-router',
  ok: health.ok,
  configuredProviders: health.configured,
  providers: health.providers,
  capabilities: health.capabilities,
  checkedAt: new Date().toISOString(),
}, null, 2))

if (!health.ok) process.exitCode = 1
