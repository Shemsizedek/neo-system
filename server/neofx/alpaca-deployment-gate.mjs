// NEO-FX-046: fail-closed Cloud Run Alpaca integration contract.
// This module deliberately does not expose public HTTP routes or store tokens.
// Production adapters MUST inject verified identity, atomic state storage, and an encrypted vault.
export const REQUIRED = Object.freeze([
  'NEOFX_ALPACA_OAUTH_CLIENT_ID',
  'NEOFX_ALPACA_OAUTH_CLIENT_SECRET_RESOURCE',
  'NEOFX_OAUTH_STATE_STORE',
  'NEOFX_OAUTH_TOKEN_VAULT',
  'NEOFX_IDENTITY_VERIFIER',
]);
export function verifyAlpacaDeployment(config, dependencies = {}) {
  const missing = REQUIRED.filter(key => typeof config?.[key] !== 'string' || !config[key].trim());
  if (String(config?.NEO_FX_LIVE_TRADING || 'false') !== 'false') missing.push('NEO_FX_LIVE_TRADING_MUST_BE_FALSE');
  if (String(config?.NEO_FX_ALPACA_ENVIRONMENT || 'paper') !== 'paper') missing.push('PAPER_ENVIRONMENT_REQUIRED');
  if (config?.NEOFX_ALPACA_OAUTH_CALLBACK !== 'https://neofx.holytemples.org/api/integrations/alpaca/oauth/callback') missing.push('CALLBACK_MISMATCH');
  for (const name of ['verifySession','saveState','takeState','getClientSecret','storeToken','getToken']) {
    if(typeof dependencies[name] !== 'function') missing.push('DEPENDENCY_'+name);
  }
  return Object.freeze({ ready: missing.length === 0, missing, liveTrading:false, environment:'paper' });
}
export async function guardedPaperAccount({ config, dependencies, sessionCredential, fetchAccount }) {
  const gate=verifyAlpacaDeployment(config,dependencies);
  if(!gate.ready) throw new Error('alpaca_configuration_blocked');
  if(typeof fetchAccount!=='function') throw new Error('account_adapter_missing');
  const identity=await dependencies.verifySession(sessionCredential);
  if(!identity?.subject || !identity?.tenantId || !identity?.authorized) throw new Error('identity_not_authorized');
  const record=await dependencies.getToken({subject:identity.subject,tenantId:identity.tenantId,provider:'alpaca',environment:'paper'});
  if(!record?.accessToken) throw new Error('paper_oauth_not_authorized');
  const account=await fetchAccount({accessToken:record.accessToken});
  // Never return raw token, client secret, account number or external account identifiers.
  return { provider:'alpaca', environment:'paper', accountStatus:account.status ?? null,
    currency:account.currency ?? null, tradingBlocked:account.trading_blocked ?? null,
    accountBlocked:account.account_blocked ?? null, observedAt:new Date().toISOString(),
    executionEnabled:false };
}
