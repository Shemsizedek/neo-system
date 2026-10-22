# NEO Knowledge / KNOWINDEX — Methodology and token purpose

Gate: KNOWINDEX-001 · Version: 0.1.0-draft · Date: 2026-10-22
Status: Prepared for review. No publication, new issuance, description update, supply lock, signature or broadcast is authorized by this document itself.

## Identity and purpose

NEO Knowledge is the partnership identified by the project sponsor between Shelton Estate & Co. and the James A. Stanback Family Trust and its Free World Knowledge Foundation. This partnership attribution is an issuer statement supplied by the sponsor; executed partnership and governing instrument documents have not been reviewed in this gate.

KNOWINDEX represents the initial 1,000 shares identified by the sponsor in the NEO Knowledge initiative. Its purpose is to support a Bitcoin-native knowledge economy: register knowledge contributions; populate and connect the World Library; record provenance and community-authorized attribution; and measure learning, knowledge production, preservation, application and economic participation. The work is intended to express Moorish and Indigenous contributions through the project's Noological Doctrine and NEO Nous OS.

The word shares records the sponsor's stated designation. The exact issuing legal entity, register of shareholders, ownership percentage per token, voting rights, transfer terms, distributions, redemption and intellectual-property entitlements must be supplied by governing documents. No percentage, payout or entitlement is inferred from the count of 1,000. A token balance is not a substitute for the governing share register unless the governing instrument explicitly makes it so.

## Separate measurement objects

1. A knowledge resource: a work, edition, dataset, lecture, recording, course, research contribution, oral history or other permitted record.
2. A contribution: a documented action by a contributor, steward, institution or participating community.
3. A measurement: a source-backed observation about a defined population and period.
4. A KNOWINDEX share: a unit of the initiative's issued asset, subject to its defined rights.
5. An optional resource NFT: a separate identified asset for an authorized work or edition. No individual KNOWINDEX share is assigned a unique work by this draft.

Resource registration, NFT ownership, copyright, custodianship, access permission and shareholding are recorded separately. Ownership of a token alone does not establish cultural authority or the right to publish restricted knowledge.

## Scope and records

Start with the existing World Library catalog and Noogle resource IDs. Preserve canonical titles, authors, editions, source URLs, media URLs, cover images and existing access classifications. Do not republish GISD-exclusive, restricted, sacred, confidential or community-controlled records merely because their public catalog entry exists.

Each eligible record adds: record version; provenance/source evidence; file hash with algorithm and byte scope; contributor attribution and role; steward; permission/license basis; community consent reference where applicable; permitted visibility; language/subject tags; GKI dimension tags; observed date; review status; correction history; and an optional Counterparty asset ID.

A community name is self-described or supplied by its authorized steward. Participation is voluntary. This project does not claim to represent every Moorish or Indigenous people, certify identity, or rank cultures. Respect a community's decision not to disclose or quantify knowledge. Public chain commitments must not reveal protected personal details or restricted content; even a hash needs a disclosure assessment for guessable/private source material.

## Pilot indicators — independent NEO measures

These are proposed operational indicators, not official GKI indicators or a financial valuation. Report annual periods with dated interim observations. Name the population, scope, cutoff and denominator for every measure; never use the entire world's knowledge as an implied denominator.

| Code | Measurement | Calculation / definition |
| --- | --- | --- |
| NK-01 | Registered knowledge | Count distinct eligible resource IDs; report works and editions separately; exclude duplicates and superseded versions from current-work totals. |
| NK-02 | Provenance coverage | Resources with reviewed source/attribution evidence / eligible resources in the declared scope × 100. |
| NK-03 | Permission coverage | Resources with documented publication/access authority / resources proposed for that access class × 100. |
| NK-04 | Access reliability | Successful scheduled checks / checks attempted for resources permitted to be accessed × 100; report protected access separately. |
| NK-05 | Preservation integrity | Expected preserved files passing a current byte-hash verification / expected preserved files checked × 100; remote links alone do not count as preserved copies. |
| NK-06 | Community participation | Count documented, consented contributions and participating organizations; report voluntary public affiliations without inferring population representativeness. |
| NK-07 | Learning and application | Report separately verified course completions, citations and documented applications, using declared definitions and deduplication. No invented outcome score. |
| NK-08 | Knowledge economy activity | Documented license events, paid research/teaching engagements and verified receipts; report transaction counts, currency, gross/net basis, period and evidence. Exclude token market capitalization and uncollected projections from receipts. |

No composite score, weighting, country ranking or forecast is active in v0.1.0. Ratify weights and normalization only after baseline data, comparability, stakeholder review and sensitivity analysis. Missing values are null, never zero. For percentage metrics require 0 ≤ numerator ≤ denominator; denominator zero means not applicable. A blockchain anchor proves a commitment's existence, not the truth or quality of the underlying claim.

## Crosswalk to official GKI 2025

The official GKI is produced by UNDP and MBRF and measures countries. NEO's pilot measures defined project/community contributions; its results are not interchangeable with national GKI scores.

| Official dimension | Proposed NEO classification |
| --- | --- |
| Pre-university education | Age-appropriate learning resources and documented educational activity. |
| TVET and higher education | Vocational materials, apprenticeships, higher learning and research training. |
| Research, development and innovation | Source-backed research, documented inventions, datasets and applications. |
| ICT | Accessible digital resources, software, digital skills and infrastructure observations. |
| Economy | Documented knowledge services, licensing and verified economic activity. |
| Environment, Social and Governance | Community stewardship, environmental knowledge, consent, governance and equitable participation records. |

Tagging a resource is classification, not proof that it improves an official country's score. Store external GKI values with publisher, country code, edition, indicator, unit, source URL, retrieval date and usage terms. Keep them in a separately attributed dataset. No UNDP/MBRF affiliation, endorsement, official score issuance or ownership is asserted.

Official source: https://www.undp.org/arab-states/publications/global-knowledge-index-2025
Official portal: https://gki.knowledge4all.com/#/en
The 115-variable count has not been independently verified for this draft.

## Explorer-compatible pilot

Use KNOWINDEX only. Retain existing supply, divisibility, ownership and supply-lock state. Prepare an enhanced information JSON with the legacy asset/description/image/website fields, plus CIP-25-style name/images/files/html fields. The 48×48 PNG is the token icon; the full card is a separate media item. Point the canonical website at the existing World Library. NEO Scan should resolve and safely render the same asset information, with source and pending-on-chain status shown.

The attached pilot is a draft. It references an already hosted Crown icon/card but has not replaced the live manifest. Its local methodology file is a review artifact, not a published URL. Do not publish a dangling methodology link. Render untrusted media and HTML with appropriate restrictions; do not execute arbitrary token-supplied HTML as the explorer's own page.

Acceptance: validate the JSON and media; review KNOWINDEX wording and share rights; identify one permitted existing library resource; link its canonical record without creating a new NFT; verify NEO Scan rendering; then compose a quantity-zero description update for KNOWINDEX and verify TokenScan's actual ingestion. CIP-25 remains an archived draft; rich-field support is unverified. Do not bulk-update the remaining 175 assets based on this pilot.

Counterparty references:
- https://docs.counterparty.io/docs/basics/assets/enhanced-asset/
- https://github.com/CounterpartyXCP/CIPs/blob/master/cip-archive/cip-0025.md
