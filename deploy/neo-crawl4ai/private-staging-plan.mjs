import { pathToFileURL } from 'node:url';

export function planCrawl4AIPrivateStaging({ imageUrl, region = 'oregon', plan = '1c-2g' } = {}) {
  const blockers = [];
  if (typeof imageUrl !== 'string' || !/^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(imageUrl)) {
    blockers.push('reviewed_immutable_ghcr_image_required');
  }
  if (!['oregon','ohio','virginia','frankfurt','singapore'].includes(region)) blockers.push('supported_region_required');
  if (!['1c-2g','2c-4g','2c-8g'].includes(plan)) blockers.push('reviewed_browser_compute_plan_required');
  return {
    gate: 'NEO-OSS-004', workspaceId: 'tea-dbhtkc8473hc73933img', workspaceName: 'NEO SYSTEM',
    status: blockers.length ? 'BLOCKED' : 'BLUEPRINT_DRAFT_REQUIRES_VALIDATION',
    applied: false, productionReady: false, blockers,
    prerequisites: [
      'Confirm the immutable image contains the reviewed Crawl4AI server and its pinned public-egress broker.',
      'Verify private TLS serving and trusted client certificate validation; the adapter rejects plain HTTP except loopback.',
      'Confirm the image listens on a private port and supplies all required runtime dependencies, including Redis if used.',
      'Run the smoke from a same-workspace, same-region private-network runner; GitHub-hosted runners cannot reach this service.',
      'Validate the generated Blueprint with current Render schema and platform validation before applying.',
      'Verify runtime quotas, browser isolation, robots behavior and image provenance before activating jobs.',
    ],
    ...(blockers.length ? {} : { blueprint: {
      previews: { generation: 'off' },
      services: [{
        type: 'pserv', name: 'neo-crawl4ai-staging', runtime: 'image', region, plan, numInstances: 1,
        image: { url: imageUrl },
        envVars: [
          { key: 'CRAWL4AI_API_TOKEN', generateValue: true },
          { key: 'CRAWL4AI_ALLOW_INTERNAL_URLS', value: 'false' },
          { key: 'CRAWL4AI_HOOKS_ENABLED', value: 'false' },
          { key: 'CRAWL4AI_EXECUTE_JS_ENABLED', value: 'false' },
        ],
      }],
    } }),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = planCrawl4AIPrivateStaging({
    imageUrl: process.env.NEO_CRAWL4AI_REVIEWED_IMAGE,
    region: process.env.NEO_CRAWL4AI_REGION || 'oregon',
    plan: process.env.NEO_CRAWL4AI_PLAN || '1c-2g',
  });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.status === 'BLOCKED' ? 1 : 0;
}
