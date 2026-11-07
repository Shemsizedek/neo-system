#!/usr/bin/env node
// NEO-OMARCHY-001: read-only host readiness check. Never installs or starts services.
import { accessSync, constants, readFileSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { pathToFileURL } from 'node:url'

export function executableOnPath(name, pathValue = process.env.PATH || '') {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) return false
  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    try { accessSync(join(directory, name), constants.X_OK); return true } catch {}
  }
  return false
}

export function isLoopbackOllamaOrigin(raw) {
  if (!raw) return true
  try {
    const url = new URL(raw)
    return ['http:', 'https:'].includes(url.protocol) &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      !url.username && !url.password && !url.search && !url.hash &&
      url.pathname === '/'
  } catch { return false }
}

export function evaluateHost({
  platform, osRelease = '', nodeMajor, binaries = {}, ollamaBaseUrl = '',
} = {}) {
  const arch = /^(?:ID|ID_LIKE)=.*\barch\b/im.test(osRelease)
  const checks = {
    linux: platform === 'linux',
    arch_base: arch,
    omarchy_cli: binaries.omarchy === true,
    node_24_or_newer: Number.isInteger(nodeMajor) && nodeMajor >= 24,
    git: binaries.git === true,
    ollama_cli_optional: binaries.ollama === true,
    container_runtime_optional: binaries.docker === true || binaries.podman === true,
    ollama_origin_loopback_or_unset: isLoopbackOllamaOrigin(ollamaBaseUrl),
  }
  const blocked = !checks.linux || !checks.arch_base || !checks.omarchy_cli ||
    !checks.ollama_origin_loopback_or_unset
  const status = blocked ? 'blocked' :
    (!checks.node_24_or_newer || !checks.git ? 'needs-setup' : 'lab-preflight-passed')
  return {
    gate: 'NEO-OMARCHY-001',
    status,
    scope: 'local-read-only-preflight',
    checks,
    ready_for_production: false,
    agents_enabled: false,
    services_started: false,
    next: status === 'lab-preflight-passed'
      ? 'Review host, private Ollama access, model license, NEOpass machine identity, and scoped agent approvals before any activation.'
      : 'Use a dedicated Omarchy lab machine or VM; resolve failed mandatory checks. No production changes permitted.',
  }
}

export function runPreflight(env = process.env) {
  let osRelease = ''
  try { osRelease = readFileSync('/etc/os-release', 'utf8') } catch {}
  const tools = ['omarchy', 'git', 'ollama', 'docker', 'podman']
  const binaries = Object.fromEntries(tools.map(name => [name, executableOnPath(name, env.PATH)]))
  return evaluateHost({
    platform: process.platform,
    osRelease,
    nodeMajor: Number.parseInt(process.versions.node.split('.')[0], 10),
    binaries,
    ollamaBaseUrl: env.OLLAMA_BASE_URL,
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runPreflight()
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(result.gate + ': ' + result.status)
    for (const [key, ok] of Object.entries(result.checks)) {
      console.log('  ' + (ok ? 'PASS' : 'CHECK') + ' ' + key)
    }
    console.log(result.next)
  }
  if (result.status !== 'lab-preflight-passed') process.exitCode = 1
}
