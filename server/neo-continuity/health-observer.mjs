import {pathToFileURL} from 'node:url'

// Fixed public paths from architecture/neo-hosts.json and the existing recovery
// gateway. Never accept destinations or credentials from an incoming request.
const targets = Object.freeze({
  prime: {url: 'https://prime.holytemples.org/health', service: 'neo-prime'},
  school: {url: 'https://school.holytemples.org/health', service: 'gisd'},
  recovery: {url: 'https://temple-continuity.shemsizedek.chatgpt.site/healthz',
    service: 'temple-continuity', mode: 'public-recovery'},
})

async function boundedJson(response) {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    await response.body?.cancel()
    return null
  }
  const reader = response.body?.getReader()
  if (!reader) return null
  const chunks = []
  let size = 0
  try {
    while (true) {
      const {value, done} = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16384) return null
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch { return null }
  finally { await reader.cancel().catch(() => {}) }
}

export async function observeContinuityHealth(id, {fetchImpl = fetch} = {}) {
  if (!Object.hasOwn(targets, id)) throw new TypeError('unknown continuity target')
  const target = targets[id]
  const checkedAt = new Date().toISOString()
  const base = {id, url: target.url, checkedAt, scope: 'public_health_only',
    functionalValidation: false, failoverEligible: false}
  try {
    const response = await fetchImpl(target.url, {method: 'GET',
      redirect: 'manual', credentials: 'omit', cache: 'no-store',
      headers: {accept: 'application/json'}, signal: AbortSignal.timeout(10000)})
    if (response.status !== 200) {
      await response.body?.cancel()
      return {...base, httpStatus: response.status, status: 'down', reason: 'http_failure'}
    }
    const data = await boundedJson(response)
    const verified = data?.ok === true && data.service === target.service &&
      (!target.mode || data.mode === target.mode)
    return {...base, httpStatus: 200, status: verified ? 'healthy' : 'unknown',
      reason: verified ? 'service_identity_verified' : 'service_identity_unverified'}
  } catch {
    return {...base, httpStatus: null, status: 'down', reason: 'request_failed'}
  }
}

export async function collectContinuityHealth(options) {
  return {execution: 'read_only',
    observations: await Promise.all(Object.keys(targets).map(id => observeContinuityHealth(id, options))),
    note: 'Health alone supplies no provider independence, quota, restore or routing authority.'}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await collectContinuityHealth(), null, 2))
}
