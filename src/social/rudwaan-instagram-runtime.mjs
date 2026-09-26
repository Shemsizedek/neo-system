// Rudwaan Instagram runtime activation gate v0.1
// Binds a connected Instagram Business/Creator account to NIA-013 only when an account id is present.

export const RUDWAAN_RUNTIME_ID = 'NOUS-RUDWAAN-004';

export function inspectInstagramRuntime({connector} = {}) {
  const accounts = Array.isArray(connector?.accounts) ? connector.accounts : [];
  const actions = Array.isArray(connector?.actions) ? connector.actions : [];
  const replyReady = actions.includes('reply_to_comment');
  const accountReady = accounts.length > 0;

  return {
    schema: 'neo.social.rudwaan-runtime-health.v0.1',
    runtimeId: RUDWAAN_RUNTIME_ID,
    agentId: 'NIA-013',
    connector: 'instagram',
    accountReady,
    replyReady,
    ready: accountReady && replyReady,
    accounts: accounts.map((a) => ({
      accountId: String(a?.id ?? ''),
      name: a?.name ?? null,
    })).filter((a) => a.accountId),
    requiredAction: accountReady ? null : 'authorize_instagram_oauth',
  };
}

export function bindRudwaanInstagramAccount(health, accountId) {
  if (!health?.ready) throw new Error('instagram_runtime_not_ready');
  const id = String(accountId ?? '').trim();
  if (!id) throw new Error('account_id_required');
  const match = health.accounts?.find((a) => a.accountId === id);
  if (!match) throw new Error('account_not_authorized');

  return {
    schema: 'neo.social.rudwaan-account-binding.v0.1',
    runtimeId: RUDWAAN_RUNTIME_ID,
    agentId: 'NIA-013',
    channel: 'instagram',
    accountId: match.accountId,
    accountName: match.name,
    capabilities: ['public_comment_reply'],
    privilegedExecution: false,
  };
}
