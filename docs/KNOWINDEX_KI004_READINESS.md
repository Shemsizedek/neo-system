# KI-004 — KNOWINDEX controlled-crawl readiness

Status: **Safety review required; crawl not enabled.**

## Existing integration

- Source: `world-library-knowindex` in `apps/noogle/index/sources.json`
- Target: `https://holytemples.org/hy/world-library/`
- Default: disabled, maxDepth=1, maxPages=10, delayMs=1500
- Reuses `apps/noogle/index/domain-crawler.mjs` and the Noogle index pipeline.

## Blocking crawler checks

1. **Robots fail closed.** A robots fetch failure, 403, or 5xx must not silently be interpreted as an empty Disallow list. Handle explicit 404 separately, with documented policy.
2. **Redirect boundaries.** Validate each redirect target before following; prohibit cross-host redirects, private-network destinations, and unsafe schemes.
3. **Avoid duplicate requests.** The current domain crawler fetches HTML, then calls `crawlPublicSource`, which may fetch the same URL again. Confirm behavior and consolidate retrieval.
4. **Scoped traversal.** Restrict the pilot to the approved World Library subtree rather than all links on the holytemples.org host.
5. **Content stewardship.** Exclude authenticated, paywalled, private, culturally restricted, and nonconsensual content; retain provenance and publisher attribution.
6. **Deterministic tests.** Mock fetch responses to test robots allow/deny, redirects, cross-host links, depth/page limits, deduplication, and timeout behavior.

## Acceptance evidence

- Tests passing in CI with recorded run URL.
- Dry-run crawl report showing requests, skips, errors, and attribution.
- Human review of sample records and cultural access labels.
- Separate approval before enabling the source in a production scheduled crawler.

## Token boundary

KNOWINDEX Counterparty asset metadata remains read-only and unverified. No token issuance, transfers, Crown Chain writes, or economic claims are authorized by this gate.
