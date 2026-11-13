# NCC-022 — Administrative Chronology and Possession Evidence Controls

**Status:** draft property-management module, no legal service, owner consent, property possession, management rights, instrument recording, or external action conferred.

## Two separate clocks
- Administrative chronology: earliest source-supported case intake and external correspondence, with historical event time separately preserved from the time later entered into the registry.
- Owner notice proof: actual signed/sent owner-addressed notice, verified addressee, delivery receipt and legal-review status. No silence-to-consent, backdated service, or automatic property-transfer effect.
- Adverse-possession analysis: the software NEVER certifies a statutory adverse-possession start date from intake, posting, lawn maintenance, a lock change or cryptocurrency publication. Texas statutory proof turns on actual visible possession and other relevant facts, with judicial/legal assessment outside the software.
- Crown Chain: independently preserve source hashes, CES posting and Bitcoin/publication references without implying either gives title or legally effective owner service.

## Implementation
- Module: server/neo-property-manager/administrative-timeline.mjs
- Tests: tests/neo-property-manager/administrative-timeline.test.mjs
- Source event types: CASE_INTAKE, RECORDS_REQUEST, BROKER_INQUIRY, POTENTIAL_BUYER_INQUIRY, OWNER_DIRECTED_CORRESPONDENCE, DELIVERY_CONFIRMATION, PUBLIC_POST, PHYSICAL_POSSESSION_EVIDENCE, MUNICIPAL_INSPECTION, RECORDED_DEED, SIGNED_AGREEMENT, COURT_ORDER, AGENCY_RESPONSE.
- Event timestamps require explicit offset, and historical occurredAt is distinct from loggedAt.
- Output preserves original intake, outbound inquiry, delivered owner correspondence lead, and possible actual-possession evidence separately.
- The statutory possession start is null even when supporting source evidence is provided: the service does not adjudicate property rights.

## Source acceptance / controls
- Original private emails and case documents must stay in private NEOpass/Deal Desk storage, not in GitHub.
- Never publish proprietary case allegations, owners' personal data, private exhibits or plain-text original document hashes on Bitcoin.
- Each outside filing, property entry, physical security measure, management operation, lender step, token issuance or binding acquisition requires independently verified authority and explicit approval.
- Owner nonresponse is a correspondence event only; not consent to convey title.

## CI acceptance
Dedicated NCC-015 through NCC-022 workflow at commit d539090cf3cec7decf934c01d6aacd3be131adab passed 54/54 synthetic tests, general CI passed.

## Primary authorities
- Texas CPRC Chapter 16: https://statutes.capitol.texas.gov/Docs/CP/htm/CP.16.htm
- Texas CPRC Chapter 12: https://statutes.capitol.texas.gov/Docs/CP/htm/CP.12.htm
- Harris County Clerk index: https://cclerk.hctx.net/Applications/WebSearch/RP.aspx