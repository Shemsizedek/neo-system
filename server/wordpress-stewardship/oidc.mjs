import { createPublicKey, verify as verifySignature } from 'node:crypto'

const ISSUER = 'https://token.actions.githubusercontent.com'
const JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks'
const EXPECTED_AUDIENCE = 'neo-wordpress-stewardship'
const EXPECTED_REPOSITORY = 'Shemsizedek/neo-system'
const EXPECTED_WORKFLOW = 'Shemsizedek/neo-system/.github/workflows/wordpress-stewardship-background.yml@'

function decodePart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
}

export async function getGitHubActionsOidcToken({ fetchImpl = fetch, audience = EXPECTED_AUDIENCE } = {}) {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!requestUrl || !requestToken) return null
  const url = new URL(requestUrl)
  url.searchParams.set('audience', audience)
  const response = await fetchImpl(url, { headers: { authorization: `Bearer ${requestToken}` } })
  if (!response.ok) throw new Error(`GitHub OIDC token request failed: ${response.status}`)
  const body = await response.json()
  if (!body?.value) throw new Error('GitHub OIDC token response did not include a value')
  return body.value
}

export function createGitHubOidcVerifier({ fetchImpl = fetch, now = () => Math.floor(Date.now() / 1000) } = {}) {
  let cachedKeys = null
  let cachedAt = 0

  async function keys() {
    const current = now()
    if (cachedKeys && current - cachedAt < 3600) return cachedKeys
    const response = await fetchImpl(JWKS_URL, { headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error(`GitHub OIDC JWKS request failed: ${response.status}`)
    const body = await response.json()
    cachedKeys = Array.isArray(body?.keys) ? body.keys : []
    cachedAt = current
    return cachedKeys
  }

  return async function verifyGitHubOidc(jwt) {
    const parts = String(jwt || '').split('.')
    if (parts.length !== 3) return false
    let header, claims
    try {
      header = decodePart(parts[0])
      claims = decodePart(parts[1])
    } catch {
      return false
    }
    if (header.alg !== 'RS256' || !header.kid) return false
    if (claims.iss !== ISSUER || claims.aud !== EXPECTED_AUDIENCE) return false
    if (claims.repository !== EXPECTED_REPOSITORY) return false
    const workflowRef = String(claims.job_workflow_ref || claims.workflow_ref || '')
    if (!workflowRef.startsWith(EXPECTED_WORKFLOW)) return false
    if (claims.ref && claims.ref !== 'refs/heads/main') return false
    const current = now()
    if (!Number.isFinite(claims.exp) || claims.exp < current) return false
    if (Number.isFinite(claims.nbf) && claims.nbf > current + 30) return false

    const jwk = (await keys()).find(key => key.kid === header.kid)
    if (!jwk) return false
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' })
    return verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, Buffer.from(parts[2], 'base64url'))
  }
}

export const githubOidcPolicy = Object.freeze({
  issuer: ISSUER,
  audience: EXPECTED_AUDIENCE,
  repository: EXPECTED_REPOSITORY,
  workflow: EXPECTED_WORKFLOW,
  ref: 'refs/heads/main'
})
