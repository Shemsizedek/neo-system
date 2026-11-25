# NEO Noocracy Publishing Engine — Gate 002

Date: November 25, 2026. Status: integration foundation; publication and recurring trigger not activated.

## Authorized settings

| Setting | Value |
| --- | --- |
| Cadence | Daily; one edition per network per America/Chicago day |
| Approval | Automatic for validated Noocracy report content |
| Metricool brand | `7080510`, Shemsizedek |
| Destinations | Existing LinkedIn and TikTok connections |
| LinkedIn format | 16:9 card with editorial caption and subscription CTA |
| TikTok format | 9:16 video; no image fallback |
| Existing schedule | Preserve; create only |
| World Bulletin | Disabled for this report lane |

The user authorized these settings on November 25, 2026. This authorization replaces the earlier manual content-review setting for this engine. It does not reroute existing social campaigns or authorize rewriting their scheduled posts.

## Additive implementation

- `registry/noocracy-metricool-gate-002.json` records the settings and unresolved inputs.
- `src/social/noocracy-metricool-publishing.mjs` prepares actual Metricool connector arguments and executes an injected create-only operation with before/after queue checks.
- `src/social/noocracy-metricool-publishing.test.mjs` exercises failure boundaries, duplicate/concurrent claims, readback, and existing route preservation.

The existing common dispatcher is unchanged. Its generic `result.id` handling means a scheduling ID would otherwise be misclassified as a published platform ID. This adapter uses separate scheduling receipts: `status: scheduled`, `published: false`, `platformPostId: null`.

## Connector contract

Use the existing authenticated Metricool connection; no new API key or direct REST transport is introduced.

`prepareNoocracyMetricoolPost(...)` returns `request` matching the exposed `createScheduledPost` tool: `blogId`, offset-bearing `date`, and serialized `info`. `info.media` contains the public media URL, `saveExternalMediaFiles` is true, `autoPublish` is true, and `draft` is false. The optional hosted `mediaFiles` argument is omitted because its ingestion behavior has not been verified.

The `readRequest` matches `getScheduledPosts`: `brandId`, `fromDate`, `toDate`, `timezone`, and `extendedRange`. The orchestrator unwraps the actual connector result into a snapshot containing those scope fields, `capturedAt`, `complete: true`, and an unchanged `posts` array. Never assert completeness for truncated, partial, errored, or unverified responses. Preserve full raw post objects, including IDs, UUIDs, media, dates, provider options and approval data.

`scheduleNoocracyMetricoolPost(plan, { createScheduledPost, readSnapshot, store })` accepts only an unchanged plan prepared in the same process. Reprepare from current verified inputs after restart instead of deserializing an old plan. The function has no update, delete, send-for-review, or approval-mutation callback. It rereads the queue immediately before its sole create operation.

## Required evidence before a create

The trusted orchestrator must verify these facts; booleans supplied by a report or other untrusted content do not constitute evidence:

1. Current Daily Noocracy Report identity, version, content SHA-256, edition date and source-aligned caption. Historical Noocracy Papers are a separate lane and cannot be substituted.
2. The user's exact LinkedIn newsletter/subscribe URL. It must be a verified newsletter destination on `linkedin.com` or `www.linkedin.com`, with a `/newsletters/` path. The LinkedIn caption ends exactly with `Subscribe on LinkedIn: <verified URL>`.
3. Public, non-expiring HTTPS media with verified response bytes, MIME, dimensions and AI classification. URL syntax checks are only defense in depth; the orchestrator must validate DNS, redirects, actual public accessibility and media identity.
4. A connected account in brand `7080510`, verified within 24 hours.
5. For TikTok, verified creator privacy options and account-specific maximum video duration. The hosted connector currently exposes no creator-info operation; this remains an explicit integration dependency rather than an invented permission. MP4/MOV and campaign dimensions are checked. Video duration must satisfy both the 3–600 second general rule and the verified account maximum.
6. A complete queue snapshot captured within five minutes that covers the full edition day and the proposed slot's one-hour spacing boundary. Existing posts take priority. Choose another slot when a collision is reported; do not move an existing post.

Prepared TikTok captions are single-line. AI media classification is carried into `tiktokData.isAigc`. Account-enforced comment/duet/stitch restrictions are preserved when supplied by verified creator capabilities.

## Duplicate and uncertainty handling

The stable key is `noocracy_report:metricool:<brand>:<local-date>:<network>`. Gate numbers, source revisions and changed captions do not reset the daily limit. The runner reuses the existing social store's `claim`, `getReceipt` and `saveReceipt` interface. A production caller must supply a verified durable store with atomic create-only claims shared by every engine instance. The in-memory store is used only for synthetic tests and proves no restart persistence.

An existing receipt is replayed without another create. A competing claim returns `reconciliation_required`. A timeout or missing create response triggers one queue readback; it never triggers a second create. Unresolved outcomes persist a non-retryable reconciliation receipt. Failure to save a receipt must not clear the original claim.

Readback must find exactly one matching pending post with the expected text, local publication time, network, media, alt text and material provider settings. A Metricool ID/UUID proves scheduling only. Actual publication later requires platform-specific evidence.

The adapter currently requires exact media URL readback. Metricool may rewrite URLs while copying external media. That case deliberately remains `reconciliation_required` until a verified mapping or byte identity is available. Do not loosen this to a check that some media exists.

All preexisting raw post records must remain equal after creation. A changed or missing record stops successful verification; the adapter does not attempt an automatic repair. Provider status transitions or another operator's edits may therefore produce a conservative reconciliation outcome. The provider offers no queue compare-and-swap here, so independent external writers cannot be made atomic by this module alone.

## Verification and outstanding gate

Offline verification uses synthetic reports, media and newsletter links only; no fixture is a publication asset. Relevant shared social tests run alongside the adapter suite. These checks do not establish a live scheduler, media ingestion, valid source, or production durable store.

On Node 24.22.3, the following check passed **59/59 tests**: **40 new adapter tests** and **19 existing social regression tests**. An independent agent reread the implementation and independently reran the 40 adapter tests, with 40/40 passing. Findings concerning plan mutation, asynchronous expiry, daylight-saving collisions, whole-day coverage, stable daily claims and provider option readback were corrected before this result. This is a bounded source review, not an external security audit or live service certification.

```bash
node --test src/social/noocracy-metricool-publishing.test.mjs src/social/neo-social-campaign-pipeline.test.mjs src/social/neo-social-campaign-runner.test.mjs src/social/neo-social-account-resolver.test.mjs src/social/neo-social-dispatcher.test.mjs
```

The operational Gate 002 check found the requested current report, exact subscription URL and hosted assets unavailable. The registry leaves source and subscription inputs null. The daily automation request was rejected because the account was at its active-task limit; no existing task was paused. Daily settings are saved, but no recurring trigger is active. No new post was created by this implementation. No repository workflow, secret, default dispatcher, existing scheduled post, or production deployment is modified.

Next acceptance evidence: verified current report and subscription URL; public card/video; TikTok creator capabilities; durable receipt-store readiness; available recurring task slot; one successful create/readback per destination that preserves the original schedule; later verified platform publication receipts.

## Primary contract references

- [Metricool API integration guide](https://help.metricool.com/basic-guide-for-api-integration-r97af)
- [Metricool API documentation](https://app.metricool.com/resources/apidocs/index.html)
- [Metricool OpenAPI schema](https://app.metricool.com/api/swagger.json)

The official schema uses `media`, `mediaAltText`, and `tiktokData.privacyOption`/`isAigc`; it has no `tiktokData.type: VIDEO` field. TikTok media format derives from the verified media asset. The creator-info schema includes `privacyLevelOptions` and `maxVideoPostDurationSec`.
