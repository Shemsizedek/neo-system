import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export const ALPACA_OAUTH = Object.freeze({
  authorizeUrl: 'https://app.alpaca.markets/oauth/authorize',
  tokenUrl: 'https://api.alpaca.markets/oauth/token',
  paperAccountUrl: 'https://paper-api.alpaca.markets/v2/account',
  callbackUrl: 'https://neofx.holytemples.org/api/integrations/alpaca/oauth/callback',
});
export function alpacaStart({ clientId, sessionId, saveState, redirectUri = ALPACA_OAUTH.callbackUrl, now = Date.now }) {
  if (!clientId || !sessionId || typeof saveState !== 'function') throw Error('missing_app_or_session');
  if (redirectUri !== ALPACA_OAUTH.callbackUrl) throw Error('redirect_mismatch');
  const state = randomBytes(32).toString('base64url');
  const stateHash = createHash('sha256').update(state).digest('hex');
  const record = { stateHash, sessionId, expiresAt: now()+300000, consumed:false, environment:'paper' };
  const url = new URL(ALPACA_OAUTH.authorizeUrl);
  Object.entries({response_type:'code',client_id:clientId,redirect_uri:redirectUri,state,env:'paper'}).forEach(([key,value])=>url.searchParams.set(key,value));
  // No trading/account:write/data scopes. Read-only access is Alpaca OAuth default.
  return Promise.resolve(saveState(record)).then(()=>url.toString());
}
export async function alpacaCallback({ state, code, sessionId, takeState, clientId, getClientSecret, storeToken, fetchImpl=fetch, now=Date.now }) {
  if (!state || !code || !sessionId) throw Error('missing_callback_parameters');
  if (typeof takeState!=='function' || typeof getClientSecret!=='function' || typeof storeToken!=='function') throw Error('missing_secure_dependencies');
  const stateHash=createHash('sha256').update(state).digest('hex');
  const record=await takeState(stateHash); // durable atomic consume, returns record once
  const a=Buffer.from(record?.stateHash||'', 'utf8'),b=Buffer.from(stateHash,'utf8');
  if (!record || a.length!==b.length || !timingSafeEqual(a,b) || record.sessionId!==sessionId || record.expiresAt<=now() || record.consumed) throw Error('invalid_or_expired_state');
  const clientSecret=await getClientSecret();
  if (!clientId || !clientSecret) throw Error('oauth_not_configured');
  const body=new URLSearchParams({grant_type:'authorization_code',code,client_id:clientId,client_secret:clientSecret,redirect_uri:ALPACA_OAUTH.callbackUrl});
  const result=await fetchImpl(ALPACA_OAUTH.tokenUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(8000)});
  if (!result.ok) throw Error('alpaca_token_exchange_failed');
  const token=await result.json();
  if (!token?.access_token) throw Error('invalid_token_response');
  await storeToken({sessionId,provider:'alpaca',environment:'paper',token});
  return {status:'authorized',environment:'paper'};
}
export async function alpacaReadOnlyAccount({ accessToken, fetchImpl=fetch }) {
  if (!accessToken) throw Error('missing_token');
  const result=await fetchImpl(ALPACA_OAUTH.paperAccountUrl,{headers:{Authorization:`Bearer ${accessToken}`,Accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if (!result.ok) throw Error('alpaca_account_unavailable');
  const account=await result.json();
  return { status:account.status, currency:account.currency, trading_blocked:account.trading_blocked, account_blocked:account.account_blocked };
}
