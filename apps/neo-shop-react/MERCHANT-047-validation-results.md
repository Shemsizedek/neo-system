# MERCHANT-047 — regression execution evidence

Date: 2026-10-21

- The repository's `merchant-feed-audit.mjs` and `merchant-feed-audit.test.mjs` were reconstructed locally from the exact fetched GitHub content and executed using Node.js v22.16.0.
- Command: `node merchant-feed-audit.test.mjs`
- Exit status: 0; output: `Merchant feed preflight regression checks passed`.
- Asserted: duplicate IDs, homepage destination, hash-routed destination, external provider domain, and missing CSV columns, plus expected normal exit and row count.
- These are **synthetic-data tests**. No real Merchant Center CSV/XML was present in searched conversation/library files.
- Connected browser remained inaccessible (originating browser context required); no live Merchant account changes or appeals were made.
- Next: obtain actual original Google product data sources, preserve source IDs, audit feed in place, perform product-URL and checkout validation, and reconcile account-level Misrepresentation requirements. Do not confuse passing unit tests with correcting production products.
