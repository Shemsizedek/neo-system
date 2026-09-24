# NEO Social Campaign Triggers v0.1

The common campaign runner implements the approved publication lifecycle:

`generate → approve → distribute → verify → audit`

## Initial trigger lanes

The first trigger bindings are intended for NOMNI / Ausarian Economics and the Daily Noocracy Report. The same runner accepts other registered content lanes after their payload is normalized by the common campaign pipeline.

## Approval

Execution is fail-closed unless the caller supplies explicit approval. Staging a payload is not equivalent to publication approval.

## Accounts

Account resolution is injected at runtime. One destination may resolve to multiple authorized accounts/pages. Account ID is included in the idempotency key so a campaign can safely publish once to each approved account.

## Idempotency and receipts

Before each write, the runner checks the durable receipt store and obtains a create-only claim. Existing receipts are replayed rather than republished. Concurrent or ambiguous claims return `uncertain-inflight` instead of issuing a second write.

Every provider result is persisted through the normalized NEO Social receipt contract. A provider acceptance without a post ID remains `submitted` pending readback; it is not silently promoted to `published`.

## Runtime providers

Provider execution remains injected. This allows the ChatGPT-connected Windsor route and repository/server direct-API adapters to share the same runner without embedding connector credentials in source code.

## World Bulletin separation

The runner handles social distribution only. Daily Noocracy Report, NOMNI, and Omnitrix remain blocked from World Bulletin under their registered lane policies. Noocracy Papers retain their separate canonical Bulletin publication path.
