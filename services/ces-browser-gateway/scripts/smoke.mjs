const endpoint = process.env.CES_BROWSER_GATEWAY_URL
const token = process.env.CES_BROWSER_GATEWAY_TOKEN

if (!endpoint || !token) {
  console.error('CES_BROWSER_GATEWAY_URL and CES_BROWSER_GATEWAY_TOKEN are required')
  process.exit(2)
}

const url = new URL('/v1/ces/browser', endpoint)
if (url.protocol !== 'https:') throw new Error('Gateway URL must use HTTPS')

async function command(sessionId, operation) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ sessionId, operation })
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.ok !== true) {
    throw new Error(`Gateway command failed (${response.status}): ${body.error ?? 'unknown error'}`)
  }
  return body
}

let sessionId
try {
  const opened = await command(undefined, { op: 'open', url: 'https://www.community-exchange.org/home/user-login/' })
  sessionId = opened.sessionId
  if (!sessionId) throw new Error('Gateway did not return a session ID')

  const current = await command(sessionId, { op: 'currentUrl' })
  const currentUrl = new URL(current.value)
  if (currentUrl.protocol !== 'https:' || currentUrl.origin !== 'https://www.community-exchange.org') {
    throw new Error(`Unexpected smoke-test origin: ${currentUrl.origin}`)
  }

  console.log(JSON.stringify({ ok: true, sessionId: '<redacted>', currentOrigin: currentUrl.origin }))
} finally {
  if (sessionId) {
    await command(sessionId, { op: 'close' }).catch(() => undefined)
  }
}
