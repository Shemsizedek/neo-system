# NEO-TRANCHI-VENDOR-GATE-004 — Technology, Account, Integration and Revenue Review

Date: 2026-11-15
Owner: Shelton Estate & Co. — prospective vendor assessment
Source intake: NEO-RE-INTAKE-2026-11-15-001
Status: **Conditional trial candidate; account not registered, paid subscription not authorized, no autonomous deal execution**
Scope correction: The November 15 intake owner explicitly directs the evaluation at **Tranchi's technology / website**, not the single example property in the social reel. The example property is a diagnostic of data quality only.

## Vendor proposition vs confirmed evidence
- Tranchi.ai is an identifiable website/business advertised as a multi-agent real-estate sourcing, screening and transaction-workflow platform. Public company listing: https://www.crunchbase.com/organization/tranchi-ai ; vendor news release: https://www.prnewswire.com/news-releases/tranchi-ai-introduces-ai--to-support-buying-homes-302746258.html
- Supplier statements: ~44 specialized agents; off-market, probate, auction, distressed leads; underwriting / DSCR / rent; offers and contract drafts; investor buyer matching and portfolio workflows. **These are described capabilities, not independent field acceptance tests.**
- Vendor-controlled Whop listing for “Tranchi Pro” exists and advertises a 44-agent stack: https://whop.com/tranchi-ai-llc/tranchi-monthly/ . The public listing inspected did **not** establish current final checkout pricing, business terms, or refund conditions; promotional secondary plan prices are not verified.
- Official website https://tranchi.ai/ was reachable for indexing but returned little readable public detail via the browser retrieval available. No public Tranchi-specific API, webhook, supported CSV/export, data rights, bulk automation policy, or formal MCP connector was independently documented during this gate. Whop platform API is *not* evidence that Tranchi exposes a customer data API.
- Independent user experience: scarce. A BiggerPockets discussion primarily asks whether anyone has used it, and a reply reproduces an AI-generated risk summary rather than a verified firsthand transaction: https://www.biggerpockets.com/forums/311/topics/1295354-anyone-have-tranchi-ai
- Automated domain-risk scoring reports concerns but is not a fraud finding: https://gridinsoft.com/online-virus-scanner/url/tranchi-ai . Do not conflate caution with proof of misconduct.

## Shelton Estate & Co. fit
**Possible fit**: a supplementary source of eligible motivated sellers, off-market leads, probate and auction data; underwriting candidate triage; draft-only contracts or introductions, feeding NEO Deal Desk/Market Agent.
**Unproven fit**: 20+ unit Houston multifamily acquisition pipeline, ≥4% documented going-in cap, fidelity of financials, ownership verification, API/export/data licensing, read-only machine ingestion, commercial redistribution, lead freshness, and real-world net returns.
**Revenue hypothesis**: verified acquisition/assignment opportunities and separately agreed NEO service offerings *could* generate actual cleared fees or investment returns. No recurring income, fee, probability of close, or deal performance is established by advertising.
**Compliance**: for Texas operations, disclosed equitable interests are material. Primary TREC rules §535.6: https://www.trec.texas.gov/agency-information/rules-and-laws/trec-rules ; no licensed brokerage or uninstructed solicitation may be inferred from software access. Other-state operations require jurisdictional review.

## Decision gates and tests
- G1 Entity and account: verify Tranchi legal seller, business account eligibility, actual final price and renewal/auto-pay, cancellation/refund in the checkout terms, support response, no coaching upsells as prerequisite. Favor demo/free account with no card. **No payment or account creation now.**
- G2 Data: request one-time sandbox/demo showing live Houston-area sourcing. Test 20 leads including the existing **20+ unit / ≥4% cap** buy-box if actually supported. Record exact source URLs, timestamps, duplicate ratio, property type, match accuracy and documented unsupported fields.
- G3 Fidelity: independently verify at least 10 lead records against appropriate primary sources and detect stale listings, wrong asking prices, claimed owner/authority, fabricated comps and unsupported NOI. Acceptance proposal: ≥90% correctly reproduced verifiable core fields; no fabricated records; no claim of successful contract from a template.
- G4 Integration: vendor proves permitted CSV/API/webhook or read-only export; evaluate terms for customer data ownership, retention, external processing, resale and automation. Use approved credentials through NEOpass, secrets in secure vault, scoped read-only permissions; do not scrape user sessions or defeat access controls.
- G5 Finance: review fully loaded monthly costs (seat, contacts/credits, SMS, lead costs, coaching, upsells, renewals) against verified qualified lead cost and hours saved, not gross advertised assignment spread. Proposed trial max 14 days with zero unapproved spending. No lead outreach until explicit separate approval, lawful contact channel and consent review.
- G6 Revenue: commercial deployment requires genuine closed-deal evidence and cleared proceeds. No securities/token issuance, sale, claim of passive income, or NEO budget commitment.

## Routing and schedule policy
Place the **Tranchi vendor watch / pilot-readiness** lane under existing **NEO Market Agent** parent automation, preserving its current four daily run slots, established real-estate buy-box, notification standards and all other duties. No sixth parent automation. On scheduled run, check for materially new vendor public plan terms, machine export / integration evidence, data quality demonstrations, independently verifiable user experience, support evidence and credible Houston multifamily coverage. Report only meaningful changed evidence; no daily marketing repetition. Do not register an account, buy anything, communicate with seller/agent, or deploy a connector without separate authorization.

Routes: NEO Market Agent → NEO Real Estate/Deal Desk (business case) → NEO Algo/Oracle (data tests) → NEOsync SCROLL/ATHENAEUM (provenance) → ORIGIN approval.
No live Tranchi integration or paid account has been demonstrated.
