// Optional startup verification through the actual protected HTTP routes.
// Logs counts and policy structure only, never credentials or account details.
export async function runStagingConnectionProbe({
  baseUrl,
  operatorToken,
  fetchImpl = fetch,
  describeKeyPolicy = async () => null,
  emit = value => console.log(JSON.stringify(value))
}) {
  const report = { event: 'modern_treasury_startup_probe', verified: false, read_only: true, payment_execution_enabled: false };
  async function finish(error) {
    if (error) report.error = error;
    if (!report.verified && report.authenticated_check_http_status && report.authenticated_check_http_status !== 200) {
      report.key_policy = await Promise.resolve().then(describeKeyPolicy).catch(() => null);
    }
    emit(report);
    return report;
  }
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl || '')) return finish('loopback_base_required');
  if (!operatorToken) return finish('treasury_operator_not_configured');
  const prefix = `${baseUrl}/v1/integrations/modern-treasury`;
  try {
    const unauthorized = await fetchImpl(`${prefix}/check`, { redirect: 'error', signal: AbortSignal.timeout(45000) });
    report.unauthenticated_http_status = unauthorized.status;
    await unauthorized.body?.cancel();
    if (unauthorized.status !== 401) return finish('treasury_auth_boundary_failed');
    const headers = { authorization: `Bearer ${operatorToken}` };
    const check = await fetchImpl(`${prefix}/check`, { headers, redirect: 'error', signal: AbortSignal.timeout(45000) });
    report.authenticated_check_http_status = check.status;
    const state = await check.json().catch(() => null);
    if (check.status !== 200) return finish(/^modern_treasury_[a-z_]+$/.test(state?.error || '') ? state.error : 'treasury_check_failed');
    if (state?.state !== 'verified' || state.environment !== 'sandbox' || state.read_only !== true || state.payment_execution_enabled !== false) return finish('treasury_sandbox_state_invalid');
    const accounts = await fetchImpl(`${prefix}/internal-accounts?per_page=1`, { headers, redirect: 'error', signal: AbortSignal.timeout(45000) });
    report.internal_accounts_http_status = accounts.status;
    const page = await accounts.json().catch(() => null);
    if (accounts.status !== 200) return finish(/^modern_treasury_[a-z_]+$/.test(page?.error || '') ? page.error : 'treasury_accounts_failed');
    if (page?.environment !== 'sandbox' || page.read_only !== true || page.payment_execution_enabled !== false || !Array.isArray(page.accounts) || page.accounts.some(account => account.live_mode !== false)) return finish('treasury_account_mode_invalid');
    report.account_count_on_page = page.accounts.length;
    report.more_pages = page.pagination?.next_after_cursor != null;
    report.verified = true;
    return finish();
  } catch {
    return finish('treasury_probe_unavailable');
  }
}
