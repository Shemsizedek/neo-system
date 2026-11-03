#!/usr/bin/env node
// NEO-OMARCHY-006: manual, one-shot, device-local Ollama certification probe.
// No daemon, no remote tools, no model install, no credentials or financial tasks.
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { runPreflight } from './neo-omarchy-preflight.mjs'
import { createOllamaAdapter } from '../server/neo-router/ollama-provider.mjs'

export async function runOmarchyLocalPilot({
  env = process.env,
  preflight = runPreflight,
  createAdapter = createOllamaAdapter,
  now = () => Date.now(),
} = {}) {
  if (env.NEO_OMARCHY_PILOT_ENABLED !== '1' ||
      env.NEO_OMARCHY_MODEL_APPROVED !== '1') {
    throw new Error('explicit_pilot_and_model_approval_required')
  }
  // Require a literal IPv4 loopback, not a DNS-dependent host name.
  if (typeof env.OLLAMA_BASE_URL !== 'string' ||
      !/^http:\/\/127\.0\.0\.1:(?:[1-9][0-9]{0,4})\/?$/.test(env.OLLAMA_BASE_URL)) {
    throw new Error('loopback_ollama_origin_required')
  }
  const url = new URL(env.OLLAMA_BASE_URL)
  const port = Number(url.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('invalid_loopback_port')
  const model = env.OLLAMA_MODEL
  if (typeof model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(model)) {
    throw new Error('reviewed_local_model_required')
  }
  const host=preflight(env)
  if (host?.status !== 'lab-preflight-passed') throw new Error('omarchy_host_not_certified')
  const started=now()
  const adapter=createAdapter({baseUrl:url.origin,model,timeoutMs:15_000})
  const result=await adapter.invoke({
    system:'You are participating in an isolated, nonfinancial test. Do not invoke tools.',
    prompt:'Respond with a short acknowledgement of a local NEO Omarchy inference pilot.',
    maxTokens:64,
  })
  if (result?.provider!=='ollama' || result.model!==model ||
      typeof result.text!=='string' || !result.text.trim()) {
    throw new Error('local_inference_not_verified')
  }
  return {
    gate:'NEO-OMARCHY-006',
    result:'local_inference_responded',
    model,
    responseSha256:createHash('sha256').update(result.text).digest('hex'),
    elapsedMs:Math.max(0,now()-started),
    source:'operator-executed-local-probe',
    liveNEOpassVerified:false,
    liveCoordinatorVerified:false,
    independentlyWitnessed:false,
    blockchainAnchorVerified:false,
    productionReady:false,
  }
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  runOmarchyLocalPilot().then(result=>console.log(JSON.stringify(result,null,2)))
    .catch(()=>{console.error('NEO Omarchy manual local pilot blocked or failed');process.exitCode=1})
}
