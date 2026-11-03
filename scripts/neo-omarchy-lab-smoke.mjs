#!/usr/bin/env node
// Manually run an authenticated smoke test against a localhost NEO Omarchy lab worker.
import { pathToFileURL } from 'node:url'
import { isLoopbackOllamaOrigin } from './neo-omarchy-preflight.mjs'
import { authorizeToken } from '../server/neo-omarchy/lab-bridge.mjs'

export function smokeConfig(env = process.env) {
  const origin = env.NEO_OMARCHY_LAB_URL
  if (!origin || !isLoopbackOllamaOrigin(origin)) throw new Error('NEO_OMARCHY_LAB_URL must be a loopback HTTP(S) origin')
  if (!authorizeToken('Bearer ' + env.NEO_OMARCHY_LAB_TOKEN, env.NEO_OMARCHY_LAB_TOKEN)) throw new Error('A 64-character lab token is required')
  if (!/^neo:agent:[a-z0-9][a-z0-9._-]{0,63}$/.test(env.NEO_OMARCHY_AGENT_ID || '')) throw new Error('A valid fixed agent ID is required')
  return { origin, token: env.NEO_OMARCHY_LAB_TOKEN, subject: env.NEO_OMARCHY_AGENT_ID }
}

export async function smoke(env = process.env, fetchImpl = fetch) {
  const config = smokeConfig(env)
  const headers = { authorization: 'Bearer ' + config.token }
  const health = await fetchImpl(new URL('/v1/health', config.origin), { headers, redirect: 'error', signal: AbortSignal.timeout(5000) })
  if (!health.ok || (await health.json()).status !== 'lab-only') throw new Error('Local lab health failed')
  const inference = await fetchImpl(new URL('/v1/infer', config.origin), {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      missionId: 'omarchy-smoke-001', subject: config.subject,
      capability: 'local-inference',
      objective: 'Respond with exactly: NEO OMARCHY LAB READY',
      maxTokens: 32,
    }),
  })
  if (!inference.ok) throw new Error('Local inference was not ready')
  const result = await inference.json()
  if (result.status !== 'completed' || result.route !== 'ollama' || typeof result.text !== 'string' || !result.text.trim()) {
    throw new Error('Local inference returned an invalid response')
  }
  // A model's reply is not a trustworthy infrastructure attestation.
  return { gate: 'NEO-OMARCHY-002', health: 'reachable', inference: 'responded', provider: 'ollama', model: result.model, production: false }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  smoke().then(r => console.log(JSON.stringify(r, null, 2))).catch(() => {
    console.error('Local lab smoke test failed; no production change was made')
    process.exitCode = 1
  })
}
