import { issueNeopassToken, verifyNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'

// Server-side Noogle NEOpass session exchange. This function cannot create a
// member or newsroom role; those are derived from authoritative services.
// The short-lived press token stays ephemeral in the requesting browser.
export async function exchangeNooglePressSession({
  baseToken, jwtSecret, jwtIssuer = 'neo-pass', authService, accessRegistry,
  now = () => Date.now(), ttlSeconds = 300
} = {}) {
  if (!baseToken) return {ok:false,status:401,error:'unscoped_neopass_session_required'}
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32 ||
      !authService || typeof authService.session !== 'function' ||
      !accessRegistry || typeof accessRegistry.resolveAccess !== 'function') {
    return { ok: false, status: 503, error: 'press_identity_exchange_not_configured' }
  }
  const time = now()
  const seconds = Math.floor((typeof time === 'number' ? time : Date.parse(time)) / 1000)
  if (!Number.isSafeInteger(seconds)) return { ok:false, status:503, error:'trusted_clock_required' }
  const claims = verifyNeopassToken(baseToken, {secret:jwtSecret,issuer:jwtIssuer,now})
  // Accept only unscoped ordinary Noogle/NEOpass sessions, never a token
  // minted for a different application, including browser or Crown tokens.
  if (!claims || typeof claims.sub !== 'string' || !claims.sub ||
    !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
    claims.iat > seconds + 30 || claims.exp <= seconds ||
    claims.exp - claims.iat > 8 * 3600 + 30 ||
    claims.scope !== undefined || claims.aud !== undefined ||
    (claims.token_use !== undefined && claims.token_use !== 'neopass-session')) {
    return {ok:false,status:401,error:'unscoped_neopass_session_required'}
  }
  try {
    const [member, access] = await Promise.all([
      authService.session(claims.sub), accessRegistry.resolveAccess(claims.sub)
    ])
    if (!member || member.subject !== claims.sub || member.neopassStatus !== 'active' ||
      !access || access.subject !== claims.sub || access.status !== 'active' ||
      !Array.isArray(access.roles) || !Array.isArray(access.caseIds) ||
      !access.caseIds.length || !access.roles.some(x => /^press:(reporter|editor|privacy|legal|auditor)$/.test(x))) {
      return {ok:false,status:403,error:'verified_press_membership_required'}
    }
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 300) {
      return {ok:false,status:503,error:'invalid_press_token_policy'}
    }
    const token = issueNeopassToken({
      subject:claims.sub,secret:jwtSecret,issuer:jwtIssuer,now,ttlSeconds,
      claims:{aud:'neo-press',scope:'press:case-access',token_use:'neopass-session'}
    })
    return {ok:true,status:200,token,expiresAt:new Date((seconds+ttlSeconds)*1000).toISOString(), tokenType:'Bearer'}
  } catch {
    return {ok:false,status:503,error:'press_identity_registry_unavailable'}
  }
}
