# KI-013 — Public verification and permissioned catalog discovery

## Verified on 2026-10-23 (independent HTTP retrieval)

- Production Noogle UI: https://shemsizedek.github.io/neo-system/noogle/ (HTTP 200).
- Production Noogle index: https://shemsizedek.github.io/neo-system/api/noogle/index.json (HTTP 200; 12 documents).
- World Library origin: https://holytemples.org/hy/world-library/ (HTTP 200).
- Exactly one approved World Library record in the public Noogle index:
  - URL: https://holytemples.org/hy/world-library/
  - Title: World Library - World Temple.
  - Indexed content SHA-256: `31070d6d92eeadab1c7c3a036e9caf0eb032100e4c3fe07b8695dc0aec632696`.
  - Retrieved: 2026-10-23T08:18:08.987Z.
- Production deployment evidence: https://github.com/Shemsizedek/neo-system/actions/runs/39924935008 (success).
- Controlled crawl evidence: https://github.com/Shemsizedek/neo-system/actions/runs/39923538252 (one page, zero errors, robots allowed).
- KNOWINDEX read-only static snapshot review and hashes: `data/knowindex/reviewed-release.json`.

The independent checks confirm retrieval of the public HTML and JSON. They do **not** prove that a user completed a browser-based interactive search session. The new `scripts/knowindex-live-smoke.mjs` validates public search-index data, freshness, and the deployed search script without sending any writes.

## Catalog discovery gate — not yet authorized for publication

The World Library landing page exposes links to external Google Drive documents and a YouTube playlist, as well as site navigation. These are **candidate references only**. A link is not authorization to mirror, republish or index the linked file's full text.

Before including any external item in Noogle:
1. Record exact canonical URL, publisher, title, MIME type, access policy, rights/license, authorization basis, and source ownership.
2. Check the host's robots policy and terms, content permissions and explicit link allowlist. Do not crawl Google Drive or YouTube content automatically.
3. Preserve retrieved timestamp, immutable content SHA-256, evidence type, and provenance chain.
4. Limit size, depth, page count, throughput, and redirects; exclude access-controlled or personal information.
5. Require a separately reviewed release manifest and reversible removal mechanism.

## Read-write gate (knowledge only)

Design requirements: identity verification, role-based permissions, consent, content moderation, schema validation, append-only audit events, rate limiting, rollback, abuse reporting, and explicit operator authorization. No production knowledge write endpoint or blockchain transaction path is authorized by KI-013.

KNOWINDEX token transactions and NEO Crown Chain writes remain separate, read-only workstreams until wallet identities, signer boundaries, interfaces, authorizations and rollback procedures are verified.
