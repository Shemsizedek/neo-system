# NEO-PRESS-001 — Investigative Press Office foundation

Status: DRAFT / NOT DEPLOYED. U.S. federal legal baseline plus North Carolina example. Prepared 2026-11-02.

## Mandate and boundaries

The NEO Investigative Press Office is a proposed non-governmental journalism and records-research function. It may research public-interest matters, interview willing sources, lawfully record events, seek public records, fact-check, and publish after editorial review. It does not confer law-enforcement status, warrant or subpoena authority, immunity, or access to restricted premises.

The NEO System already has a research router, evidence fusion, an evidence vault and York Case Crawler. This gate adds independent editorial governance: court findings, government allegations, defense claims, community accounts, and journalistic findings must remain distinguishable. A repository commit is not a public-facing newsroom deployment.

## Historical press-credential policy

One user-supplied historical press credential dated 2015 states reporter/photographer/videographer affiliation with a press association. The scanned image and identifying fields MUST NOT be committed to this public repository. Private encrypted-vault storage requires explicit authorized intake. Treat issuer, document authenticity and present membership as unverified until independently established.

Credential states: USER_PROVIDED_UNVERIFIED, HISTORICAL_ISSUER_VERIFIED, CURRENT_STATUS_VERIFIED, DISPUTED, REVOKED. A historical credential is not proof of current membership and does not grant governmental powers. Constitutional press rights do not depend on an association card.

## Legal-rights reference (not legal advice)

- First Amendment: protects press, expression, public discussion and petition; restrictions and available remedies vary with facts and law.
- Access: Pell v. Procunier, 417 U.S. 817 (1974), rejects a categorical press right of special access to information or places closed to the public. https://supreme.justia.com/cases/federal/us/417/817/
- Recording: Sharpe v. Winterville Police Department, 59 F.4th 674 (4th Cir. 2023), found an alleged blanket traffic-stop livestream restriction implicated speech protection, but affirmed qualified immunity for the individual officer under the facts and law then established. No unrestricted right in all places or situations. https://law.justia.com/cases/federal/appellate-courts/ca4/21-1827/21-1827-2023-02-07.html
- Remedies: 42 U.S.C. §1983 can provide civil remedies for certain constitutional violations under color of state law; immunity defenses and Monell municipal policy/custom requirements can apply. Section 1988 provides discretionary fee awards in qualifying cases, not automatic compensation.
- Federal FOIA: requests go to the appropriate federal agency and generally exclude Congress, federal courts and state/local agencies. https://www.foia.gov/how-to.html
- North Carolina public records: G.S. 132-1 defines public records; G.S. 132-6 generally allows any person to request available nonexempt records without revealing purpose. https://www.ncleg.gov/enactedlegislation/statutes/html/bysection/chapter_132/gs_132-1.html and https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_132/GS_132-6.html
- North Carolina interception: G.S. 15A-287 generally requires consent by at least one party for covered communications, with exceptions. Jurisdiction, context and additional law can alter recording rules. https://www.ncleg.gov/enactedlegislation/statutes/html/bysection/chapter_15a/gs_15a-287.html

The 2015 credential's citations (including Perry) do not override location-specific recording, access or court restrictions. Check venue, state, facility rules, audio law, safety and non-obstruction requirements before fieldwork.

## Mandatory private evidence workflow

1. Assign a case ID and evidence ID; record original source URL, acquisition method and UTC timestamps.
2. Preserve original media bytes unchanged in an authorized encrypted evidence vault, not GitHub. Calculate SHA-256 at intake and export. Hash equality detects change but cannot alone verify underlying truth or legal admissibility.
3. Track custodian, each transfer, access and derivative transformation separately. An append-only log and authenticated custody require later integration.
4. Classify source as PRIMARY / AUTHORITATIVE / SECONDARY / LEAD. Keep allegations, court findings, interviews and independently verified facts distinct. Social media starts as a lead until substantiated; copied assertions do not multiply corroboration.
5. Preserve contradictory materials and potential exculpatory evidence. Never assign motive solely from identity or affiliation.
6. Protect confidential sources, children, victims, addresses and private credentials. Do not publish a record merely because it was lawfully obtained.
7. Require accuracy review, privacy/safety review, legal-risk review, editorial authorization, and fair opportunity to respond where appropriate prior to serious adverse publication.

## Release boundary

This gate includes a charter, reference law, a privacy-preserving evidence metadata module, tests, and an editorial template. It does NOT upload or verify the credential, activate surveillance, publish case allegations, create a live press portal, persist evidence, or attest to governmental status.

Next gate NEO-PRESS-002: integrate authenticated evidence metadata with NEO Evidence Vault, enforce NEOpass access controls, append-only custody log, independent editorial review, and counsel-checked jurisdiction matrix.
