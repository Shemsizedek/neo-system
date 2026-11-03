import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createCrawl4AICrawler, CRAWL4AI_CONTRACT_REVISION } from '../server/neo-crawler/crawl4ai.mjs';

const SOURCE = 'https://holytemples.org/world-library/';
const REQUIRED = ['NEO_CRAWL4AI_ORIGIN', 'NEO_CRAWL4AI_TOKEN'];
const safeError = error => /^crawl4ai_[a-z_0-9]+$/.test(error?.message || '')
  ? error.message : 'staging_request_failed';

export async function validateCrawl4AIStaging({
  env = process.env, live = false, fetchImpl = fetch, lookupImpl,
  now = () => new Date().toISOString(), probeTimeoutMs = 5000,
} = {}) {
  const report = {
    gate: 'NEO-OSS-003', observedAt: now(), mode: live ? 'live-smoke' : 'preflight',
    source: SOURCE, contractRevision: CRAWL4AI_CONTRACT_REVISION,
    productionReady: false, networkIsolation: 'not_verified_by_this_check',
    deployedRevision: 'not_verified_by_this_check',
    publicIndexWrites: 0, evidenceVaultWrites: 0, sourceCrawlAttempts: 0,
    checks: [], blockers: [],
  };
  const missing = REQUIRED.filter(name => typeof env[name] !== 'string' || !env[name].trim());
  if (missing.length) {
    report.status = 'BLOCKED';
    report.blockers.push({ code: 'missing_configuration', names: missing });
    return report;
  }
  let crawler, origin;
  try {
    crawler = createCrawl4AICrawler({
      serviceOrigin: env.NEO_CRAWL4AI_ORIGIN, apiToken: env.NEO_CRAWL4AI_TOKEN,
      allowedOrigins: ['https://holytemples.org'], fetchImpl, lookupImpl,
    });
    origin = new URL(env.NEO_CRAWL4AI_ORIGIN);
  } catch {
    report.status = 'BLOCKED';
    report.blockers.push({ code: 'invalid_configuration' });
    return report;
  }
  if (!live) {
    report.status = 'CONFIGURED_NOT_TESTED';
    return report;
  }
  if (env.NEO_CRAWL4AI_STAGE !== 'isolated-staging') {
    report.status = 'BLOCKED';
    report.blockers.push({ code: 'isolated_staging_selection_required' });
    return report;
  }
  // Empty URL lists cannot initiate a source crawl, even on an unprotected service.
  // Both missing and invalid tokens must be rejected before the positive request.
  async function probeAuthorization(name, authorization) {
    const controller = new AbortController();
    let timer;
    let response;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('staging_probe_timeout')); }, probeTimeoutMs);
      });
      response = await Promise.race([fetchImpl(new URL('/crawl', origin), {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
        body: JSON.stringify({ urls: [] }),
      }), timeout]);
      const passed = response.status === 401 || response.status === 403;
      report.checks.push({ name, passed, httpStatus: response.status });
      return passed;
    } finally {
      clearTimeout(timer);
      // Do not read or retain potentially sensitive error bodies.
      response?.body?.cancel().catch(() => {});
    }
  }
  try {
    if (!await probeAuthorization('missing-token-rejected')) {
      report.status = 'BLOCKED';
      report.blockers.push({ code: 'service_authentication_not_enforced' });
      return report;
    }
    if (!await probeAuthorization('invalid-token-rejected', 'Bearer invalid-staging-probe-' + randomUUID())) {
      report.status = 'BLOCKED';
      report.blockers.push({ code: 'service_authentication_not_enforced' });
      return report;
    }
    report.sourceCrawlAttempts = 1;
    const envelope = await crawler.crawl({ adapter: 'crawl4ai', url: SOURCE });
    const doc = envelope.result;
    report.checks.push({ name: 'scoped-extraction', passed: true });
    report.checks.push({ name: 'review-only-envelope', passed: envelope.classification.lmsPublicationAutomatic === false && doc.evidenceState === 'unverified' });
    report.document = {
      url: doc.url, retrievedAt: doc.retrievedAt, contentHash: doc.contentHash,
      contentHashScope: doc.contentHashScope, markdownBytes: Buffer.byteLength(doc.markdown),
      evidenceState: doc.evidenceState,
    };
    report.status = report.checks.every(x => x.passed) ? 'SMOKE_PASSED_NETWORK_REVIEW_REQUIRED' : 'BLOCKED';
    report.blockers.push({ code: 'independent_network_and_deployment_verification_required' });
  } catch (error) {
    report.status = 'BLOCKED';
    report.blockers.push({ code: safeError(error) });
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--live')) {
    process.stderr.write('Usage: node scripts/neo-crawl4ai-staging.mjs [--live]\n');
    process.exitCode = 2;
  } else {
    const report = await validateCrawl4AIStaging({ live: args.includes('--live') });
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    process.exitCode = report.status === 'BLOCKED' ? 1 : 0;
  }
}
