# NEO-OSS-002 — Crawl4AI extraction adapter
Date: 2026-11-03
Status: implemented for review; live activation pending.
Dependency: draft PR #1311 (NEO-OSS-001). This PR is stacked on its branch.

## Result
Adds an explicit Crawl4AI adapter to NEO Crawler. Its output matches the Noogle
document schema, passes through the existing provenance envelope, and can use the
existing queue worker, evidence fingerprint sink and Router event path.
The worker runtime now accepts an injected crawler. The default singleton and
default production startup remain unchanged. No runtime package was installed.

## Contract and use
Upstream API/schema/egress implementation inspected at:
https://github.com/unclecode/crawl4ai/tree/888299fb5f0b82181897dc0e61bfb4b036f0aea5
Contract files: deploy/docker/server.py, api.py, schemas.py, egress_broker.py,
crawl4ai/async_configs.py and cache_context.py. This revision is a source-contract
reference, not evidence that a deployed worker uses that revision.

```js
import { createCrawl4AICrawler } from './server/neo-crawler/crawl4ai.mjs';
import { createCrawlerWorkerRuntime } from './server/neo-crawler/worker-runtime.mjs';

// Server-owned configuration. Never derive these values from queue/job input.
const crawler = createCrawl4AICrawler({
  serviceOrigin: process.env.NEO_CRAWL4AI_ORIGIN,
  apiToken: process.env.NEO_CRAWL4AI_TOKEN,
  allowedOrigins: ['https://holytemples.org'],
});
const { worker } = createCrawlerWorkerRuntime({ crawler });
// A scoped queue item uses:
// { adapter: 'crawl4ai', url: 'https://holytemples.org/world-library/' }
```

The service origin must be HTTPS, or HTTP on loopback. The adapter sends only a
single seed URL with fixed browser/crawl settings. Job-supplied hooks, JavaScript,
proxy settings, tokens, provider options and evidence status are ignored.
Robots checking is requested. Page JavaScript, downloads, screenshots, PDF and
iframe processing are disabled. CacheMode uses upstream's serialized 'bypass'
enum value. Upstream robots handling and access-denial behavior still need live
validation; a request flag alone is not proof of enforcement.

## Scope and provenance
- Seed URLs require an exact operator allowlisted HTTPS origin. URL credentials,
  non-default ports, local/special hostnames and IP literals are rejected.
- DNS preflight rejects empty, private, special and mixed answers. IPv6 answers
  are conservatively unsupported in this gate.
- No redirect following on the adapter-to-service request. Returned seed/final
  URL mismatches are rejected. This output check cannot undo a browser fetch.
- One concurrent request and a one-second start interval per adapter instance;
  deployments with multiple workers still need a shared service rate limit.
- A single deadline includes DNS, API fetch and body reading. Streaming API
  responses and extracted Markdown have separate byte ceilings.
- URL, retrieval time, title, Markdown and SHA-256 are normalized. Hash scope is
  explicitly 'extracted-markdown-utf8', also preserved in evidence notes.
  This does not claim preservation of original HTML, independent attestation,
  verified authorship, legal truth or automatic publication.
- Raw service bodies, headers and tokens are excluded from output/error logs.
  Extracted page text remains untrusted data for downstream models and rendering.

## Network boundary and activation prerequisites
Client DNS preflight does NOT pin the remote browser's DNS or protect every
redirect/subresource. Browser egress is a separate deployment boundary.
Before activation, the isolated private Crawl4AI service must:
1. Use a reviewed immutable image digest/revision and authenticated private ingress.
2. Enforce pinned public-only egress across seeds, redirects, robots, previews,
   subresources and all HTTP clients. Keep CRAWL4AI_ALLOW_INTERNAL_URLS=false;
   upstream server.py starts its pinning proxy, but verify the deployed behavior.
3. Keep hooks/execute_js disabled and use isolated anonymous browser profiles,
   without user sessions, production secrets, wallet keys or internal-network access.
4. Apply server-side memory/page/wall-clock quotas and shared rate limits.
5. Pass live tests for DNS rebinding, private/IPv6/metadata targets, redirects,
   subresource access, robots denial, malformed results and token redaction.
6. Verify source access permissions and public-page behavior; do not bypass login,
   CAPTCHA or paywalls. Do not queue confidential URLs or query secrets.

No automatic environment activation is introduced; configuration/factory use
requires an explicit deployment change after the network checks above.
No live Crawl4AI service was contacted or provisioned in this gate.
No public Noogle index was written.

## Validation and release boundary
47 targeted local Node tests passed: 12 new adapter/integration tests, 10 existing
Crawler/worker/queue/evidence tests and 25 Gate 001 provider/Router tests.
All external service and DNS calls in the new tests were mocked.
The focused CI workflow runs the same set without credentials.

At inspection, Gate 001's local-inference-contract CI check passed, while broader
validate/build/three-plane and several external Workers checks failed. Their
root causes were not established here. These remain release blockers; no merge,
production deployment, DNS/database change or scheduled crawl was performed.

Next gate: provision and validate isolated Crawl4AI staging, run a scoped public
source through the live contract, then add reviewed Noogle ingestion and
Playwright coverage. Full application build and broader CI recovery remain open.
