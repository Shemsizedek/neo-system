// NEO Social — provider-aware dispatcher v0.1
// Pure routing/normalization layer. Provider execution is injected by runtime.

const DEFAULT_PROVIDER_ORDER = Object.freeze({
  facebook: ['windsor_organic', 'direct_platform_api'],
  linkedin: ['windsor_organic', 'direct_platform_api'],
  x: ['windsor_organic'],
  youtube_community: ['youtube_community_ui'],
});

export function resolveProviderOrder(destination, providerOrder = DEFAULT_PROVIDER_ORDER) {
  const order = providerOrder?.[destination];
  if (!Array.isArray(order) || order.length === 0) {
    throw new Error(`no_provider_route:${destination}`);
  }
  return [...order];
}

export function normalizeProviderResult({
  provider,
  destination,
  accountId,
  contentId,
  sourceVersion,
  result,
  submittedAt = new Date().toISOString(),
} = {}) {
  for (const [field, value] of Object.entries({provider, destination, accountId, contentId, sourceVersion})) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}_required`);
  }

  const platformPostId = result?.platformPostId ?? result?.post_id ?? result?.id ?? result?.shareUrn ?? null;
  const url = result?.url ?? result?.permalink_url ?? null;
  const accepted = result?.accepted !== false && result?.success !== false;
  const status = platformPostId ? 'published' : accepted ? 'submitted' : 'failed';

  return {
    schema: 'neo.social.dispatch-receipt.v0.1',
    provider,
    destination,
    accountId: String(accountId),
    contentId,
    sourceVersion,
    status,
    platformPostId: platformPostId ? String(platformPostId) : null,
    url,
    submittedAt,
    verification: platformPostId ? 'provider-receipt' : status === 'submitted' ? 'pending-readback' : 'provider-failure',
  };
}

export async function dispatchSocialJob(job, runtime, options = {}) {
  if (!job?.destination) throw new Error('destination_required');
  if (!runtime || typeof runtime.execute !== 'function') throw new Error('runtime_execute_required');

  const order = resolveProviderOrder(job.destination, options.providerOrder ?? DEFAULT_PROVIDER_ORDER);
  const attempts = [];

  for (const provider of order) {
    const available = typeof runtime.isAvailable === 'function'
      ? await runtime.isAvailable(provider, job.destination, job)
      : true;
    if (!available) {
      attempts.push({provider, status: 'unavailable'});
      continue;
    }

    try {
      const result = await runtime.execute(provider, job);
      const receipt = normalizeProviderResult({
        provider,
        destination: job.destination,
        accountId: result?.accountId ?? job.accountId,
        contentId: job.contentId,
        sourceVersion: job.sourceVersion,
        result,
      });
      return {...receipt, attempts: [...attempts, {provider, status: receipt.status}]};
    } catch (error) {
      attempts.push({provider, status: 'error', error: error?.message ?? String(error)});
      if (options.failFast === true) throw error;
    }
  }

  const error = new Error(`all_providers_failed:${job.destination}`);
  error.attempts = attempts;
  throw error;
}

export { DEFAULT_PROVIDER_ORDER };
