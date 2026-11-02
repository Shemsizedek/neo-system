# NEO-PRESS-005 — Private case desk and authenticated local staging

Date: 2026-11-02. **Draft integration gate; no real user data, live identity service, DNS, site, or production press server was deployed.**

## Changes

- **Private paginated case catalog:** \`listCaseEvidence(caseId, {limit,offset})\` reads only records for one assigned case. Returns editorial classification, restricted/public flag, original-media-verification flag, and correction hold. Does NOT return source URL, source-locator hash, original-media hash, raw contents, contact details or uploaded credentials.
- **Append-only corrections:** \`submitCorrection(evidenceId,{category,summary},actorSubject)\` writes a separate protected correction record and a hash-chained case-custody event. Categories: FACTUAL_ERROR, SOURCE_DISPUTE, CONSENT_WITHDRAWN, REDACTION_REQUEST. Original evidence, attribution, digital signatures and review history remain untouched. Any unresolved correction **blocks the release candidate** even if three earlier reviewers approved. Corrections are **not** automatically resolved or published. The note is sensitive and must remain in an encrypted, access-controlled database.
- **NEOpass-case-scoped API:** GET /api/v1/press/cases/:id/evidence, POST/GET /api/v1/press/evidence/:uuid/corrections. Every call verifies signed, audience-restricted bearer, active membership and the **server-side** press-role / case assignment registry. Only press editors and privacy reviewers can submit corrections; authorized reporter/editor/auditor/privacy/legal roles can read assigned case metadata.
- **Mobile case desk:** Case catalog and editorial correction form added to existing responsive private portal. Uses direct DOM events and textContent; no browser source storage, no credential scans, no publication control. In-browser Noogle token exchange remains conditional on the host providing a valid in-memory NEOpass session. It is **not a proof of production login**.
- **Loopback-only integration harness:** \`createLocalPressStaging\` requires \`allowLocalTest:true\`, \`mode:'EPHEMERAL_TEST_ONLY'\`, explicit injected test store and test NEOpass/press registries, and binds **only** to 127.0.0.1 with ephemeral port. It refuses activation if \`NEO_PRESS_PRODUCTION_ENABLED=true\`. It cannot create a public server by itself. No live Render service, actual secrets, or production press data was touched.
- **Automated tests:** case isolation, pagination, correction holds, unapproved and cross-case access, verified local test sessions, and no production exposure, plus all previous press-specific encryption/custody/identity tests.

## Required deployment evidence

Gate 004 requires eleven independently signed control statements; a signature only verifies an assertion and not its truth. Those remain required, along with independent review of the actual protected runtime. Specifically:

1. Resolve stacked PRs #1304, #1305, #1306, #1307, and this gate in correct dependency order.
2. Fix global CI (prior GISS assertion failure) and architecture inventory drift; confirm all press-specific tests.
3. Verify real Noogle/NEOpass login with permitted in-memory token handoff, validated issuer, revocation, the live case registry, and a correctly restricted press audience. **Mock session tests cannot certify live identity.**
4. Keep legacy Evidence Vault isolated/remediated; validate restricted disk, encrypted SQLite volume, independent backup and recovery, trustworthy KMS keys, and prevent unauthorized shared-path access.
5. Security-review corrections: redact sensitive notes from any public endpoint, define amendment/re-review workflow, test audit deletion/replay, quota and rate limits, access revocation, XSS and SSRF, concurrency, and storage retention policy.
6. Obtain independently retrievable custody checkpoint evidence and jurisdiction-specific counsel review.
7. Require explicit, separate authorized human approval for any public press portal, actual credential ingestion or publication.

## Release decision

**Gate 005 is a staging and integration candidate, not a production service**. It has no external publisher, email campaign, automated social posts, real association validation, investor functions or law-enforcement authority. No credential image from the conversation was uploaded.

**Next Gate NEO-PRESS-006:** Harden independent production runtime and secured corrections workflow; connect a real Noogle NEOpass session only after role registry, encrypted storage and independent security review are certified. Record verifiable production smoke evidence, then require a separate authorization before deployment.
