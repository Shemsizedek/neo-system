# NEO-OSS-003 — Executable staging validation
Date: 2026-11-03
Implementation: ready for review. Live validation: BLOCKED.
Stacked on #1312; no merge or deployment performed.

## Observed deployment state
The user selected Render workspace NEO SYSTEM (tea-dbhtkc8473hc73933img).
Its 12 returned services contain no Crawl4AI deployment. The similarly named
NEO workspace was not inspected. Current execution configuration contains neither
NEO_CRAWL4AI_ORIGIN nor NEO_CRAWL4AI_TOKEN. No secret values were requested.
This is not evidence about uninspected Render/GitHub secret stores.

Gate 001 and Gate 002 focused GitHub CI checks passed. Broader CI has two
identified failures: the GISS integration test expects the old School District
wording while the page renders School System; the architecture check reports
app inventory drift. External Cloudflare Worker builds also failed, without an
established cause. No tests or policy checks were weakened to bypass these.
Observed status is recorded in architecture/evidence/neo-oss-003-staging.json.

## Implemented
scripts/neo-crawl4ai-staging.mjs provides a preflight and explicit live smoke.
Default invocation makes no network requests:
```bash
node scripts/neo-crawl4ai-staging.mjs
```
Missing/invalid configuration returns BLOCKED and exit code 1; configuration
presence returns CONFIGURED_NOT_TESTED. Neither state claims a working service.

After isolated staging is provisioned and egress reviewed, bind the origin and
token using secret storage and set NEO_CRAWL4AI_STAGE=isolated-staging:
```bash
node scripts/neo-crawl4ai-staging.mjs --live
```

Live mode first checks that missing and invalid bearer tokens return 401/403.
These probes contain an empty URL list, so they cannot initiate a source crawl.
Any unexpected response stops execution before sending a real token/source.
It then attempts exactly one adapter crawl of:
https://holytemples.org/world-library/

Output retains only normalized URL, retrieval time, content hash/hash scope,
Markdown byte count and review-only evidence state. It excludes extracted page
text, service origin, tokens and raw errors. It does not write to Noogle, the
evidence vault, a queue, database or public site. The intended source may be
unavailable or redirect; that causes a recorded failure rather than substitution.

SMOKE_PASSED_NETWORK_REVIEW_REQUIRED means authentication/extraction worked;
it always retains productionReady=false. It is not a deployment identity check,
a complete SSRF test, an independently witnessed egress attestation, confirmation
of robots enforcement or authorization to start scheduled crawling.

## CI and execution
The new workflow runs 56 focused tests on relevant PR changes.
Its manual live input defaults false. A live run uses only the staging secrets
NEO_CRAWL4AI_STAGING_ORIGIN and NEO_CRAWL4AI_STAGING_TOKEN. No secret was created
and no manual live run was dispatched. The operator must use a commit containing
this workflow and the adapter, with the intended isolated staging endpoint.

The real local preflight returned BLOCKED for missing connection configuration,
with zero source-crawl attempts. All 56 focused local tests passed, including
nine new tests for preflight, authentication gates, bounded probes, metadata-only
output and accurate release status. Mocked successful tests are not live proof.

## Next actionable deployment step
Provision or identify the private authenticated Crawl4AI staging service in the
confirmed NEO SYSTEM workspace. The currently exposed Render create-service
tool creates public web services, not the private service required here, so it
was not used to substitute a public deployment. No paid resource was created.

Record a reviewed image digest/revision and verify pinned public-only egress,
redirect/subresource/robots behavior, quotas and isolated browser state as
specified in NEO-OSS-002. Bind the secrets, run the manual smoke, retain the
metadata report, and recover broader repository CI before considering release.
