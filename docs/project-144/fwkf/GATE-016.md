# Project 144 — World Café Gate 016: Public website and product lanes

**Date:** November 1, 2026  
**Status:** Seven-page public site live; World Library and City references updated; forum and café network are in development.

## Public product identity

**Free World Knowledge Foundation** is the parent public identity at https://worldcafe.holytemples.org/.

**World Café** has two distinct program areas:
- **World Café Events** — planned talks, workshops, community gatherings and library programming.
- **World Café Conversations** — discussion and community learning that may link to future moderated forum conversations.

**Physical Knowledge Cafés** are a planned hospitality and learning business network. The World Temple Hall of Knowledge World Library is the proposed flagship hosting location in the Holy See Global District. The city network is a goal; no venue, café opening, event schedule or local operator is represented as operational.

**Free World Knowledge Forum** is a planned, topic-based online community for the Knowledge Society / Information Society. The publicly visible page is only the product introduction; no public threads, posting, registration, member data, votes or moderation backend are active. Existing World Leaders Forum is a separate service and is not repurposed.

**Investor Relations** is the only visitor-facing section detailing the Counterparty/Bitcoin KNOWINDEX asset. No issuance, investor rights, payment, transfer or offering is initiated by the website.

## User-friendly navigation

- Home — `/`
- World Café Events — `/events.html`
- World Café Conversations — `/conversations.html`
- Knowledge Cafés — `/cafes.html`
- Free World Knowledge Forum — `/forum.html`
- Knowledge & Learning — `/knowledge.html`
- Investor Relations — `/investor-relations.html`
- World Temple World Library — `https://holytemples.org/world-library/`

Responsive, shared stylesheet: `apps/fwkf-worldcafe/public/site.css`; no external frontend package, API, private chat or user submissions are used.

## Reciprocal World Temple changes

- **World Library (WordPress page ID 79):** inserted an editable, stand-alone World Café section near the top, pointing to Events, Conversations, Knowledge Cafés and the Foundation. The library is called the planned physical home; opening dates are not asserted.
- **World Temple City (WordPress page ID 3040):** simplified the World Café description and roadmap, linked the public café and forum pages, and removed token-related links from the general city/community card. Existing city and education programs remain unchanged.
- Both mutations used WordPress section-specific operations and were acknowledged without content warnings.

## Publishing/privacy boundary

- Removed old public pages' private operational project language and confusing internal codes. Public pages do not contain private conversations, participant identities, access credentials, raw project archives or unverified event/venue claims.
- Replaced `/knowindex.json` with a public-safe definition-only resource and added `/knowledge-index.json` alias. Eight plain-language index terms all have `value: null`. No token, asset issuer, private NEO state or Bitcoin operations are published in the feed.
- Updated the read-only index inspector, unit tests, reference draft and KNOWINDEX metadata draft to point information seekers to the appropriate Knowledge or Investor Relations page. **No production Crown Chain ingestion or on-chain metadata write.**
- Site remains readable by URL but has `noindex,nofollow` until publication and organization/compliance review clears it.

## Verification

- Static automated source gate: **PASS** for seven pages, responsive shared CSS, valid internal links, accessible navigation structure, privacy exclusion and token disclosure segregation.
- Knowledge-index read-only unit tests: **3/3 passed**.
- Render static site deployment `dep-dbjpe4p42hec73dng7b0`: **live**, using branch `workstreams/fwkf-worldcafe-hosting-006`.
- Independent HTTPS checks returned HTTP 200 for homepage, six other pages, stylesheet and both updated WordPress pages. A short cache propagation interval briefly served the old homepage; a subsequent fresh check confirmed the new page on the custom domain.
- Live knowledge-index endpoint checks returned HTTP 200 with eight public indicator definitions and no asset ID/private project copy.
- Additional device-based full live test timed out; do not count that check as passed. Live publishing and hosting remain fully cloud-based and do not rely on the device.

## Next delivery gates

- **FWKF-017 — Forum MVP:** https://github.com/Shemsizedek/neo-system/issues/1298 — dedicated product, real authentication, moderation, reporting, privacy, threaded posts, voting and backups before posting enabled.
- **FWKF-018 — Knowledge Café operations:** https://github.com/Shemsizedek/neo-system/issues/1299 — library hosting permission, business planning, permits, operator SOPs, first pilot then multi-city rollout. No expenditure, leases or location commitments are authorized.
- KNOWNINDEX / Crown Chain work continues **read-only** until existing security, governance, consent and financial-compliance gates are satisfied. Investor information is separate from knowledge education pages.

**Decision:** Do not publish private chat material; do not claim a physical café, forum discussion board or token offering is operational before it is verified. Preserve the seven-page user experience as the public baseline.
