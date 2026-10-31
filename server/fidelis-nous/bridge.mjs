import { verifyCrownAuthorization } from '../crown-auth/verify.mjs'

const CAPABILITIES = Object.freeze({
  'knowledge:read': 'fidelis:knowledge:read',
  'knowledge:propose': 'fidelis:knowledge:propose'
})

export function fidelisNousCapabilities() {
  return Object.freeze({ status: 'sandbox', readOnlyByDefault: true, tokenIssuance: false, ledgerWrites: false, liveLmsWrites: false, scopes: CAPABILITIES })
}

export async function authorizeFidelisNous({ authorization, action = 'knowledge:read', verify = verifyCrownAuthorization } = {}) {
  if (!Object.hasOwn(CAPABILITIES, action)) return { ok: false, status: 403, error: 'FIDELIS_ACTION_DENIED' }
  if (!authorization || typeof authorization !== 'string') return { ok: false, status: 401, error: 'FIDELIS_AUTH_REQUIRED' }
  return verify({ authorization, requiredScope: CAPABILITIES[action] })
}

export function proposeKnowledgeRecord({ title, source, collection, doctrine = 'Noological Doctrine' } = {}) {
  const allowed = new Set(['temple-knowledge-index', 'world-library', 'world-cafe', 'free-world-knowledge-index'])
  if (typeof title !== 'string' || !title.trim() || title.length > 200) throw new Error('invalid_title')
  if (typeof source !== 'string' || !/^https:\/\//.test(source)) throw new Error('invalid_https_source')
  if (!allowed.has(collection)) throw new Error('invalid_collection')
  return Object.freeze({ title: title.trim(), source, collection, doctrine, status: 'proposed', published: false, ledgerWritten: false })
}
