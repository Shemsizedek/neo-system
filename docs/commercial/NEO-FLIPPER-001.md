# NEO Flipper — Project 144 / NEO-FLIP-001

**Status:** MVP decision engine; staging and production NOT deployed. No live providers or CRM persistence connected.

**Owner:** Shelton Estate & Co. / NEO Houses. **Coordinator:** NIA-013 NEO Deal Desk.

## Objective
Build a low-touch, digital-first workflow for lawful assignment of a principal's genuine contractual or option interest: discover, confirm rights, match an authorized buyer, collect written disclosures, obtain human approval, route appropriate documents to an e-sign provider, coordinate an independent title/escrow closer, and reconcile verified assignment proceeds. No income is guaranteed.

## Legal and commercial boundaries
- Pilot jurisdiction: Texas (US-TX). Other jurisdictions and other classes of contracts remain blocked pending qualified counsel review.
- Texas Occupations Code §1101.0045, Texas Property Code §5.0205, and TREC rule 22 TAC §535.6 address disclosure and/or licensing boundaries for assignments of option/contract interests. Verify current wording before external operations.
- The agent must hold or represent a properly documented principal contractual interest; never sell the seller's real property as if NEO owns it, or charge an unlicensed brokerage/referral commission for matching third parties.
- Written disclosures to the property owner and prospective buyer, actual assignability, seller consent if the contract requires it, and legal review are mandatory evidence gates.
- Texas Business and Commerce Code chapter 322 allows eligible electronic transactions where parties agree to conduct them electronically; each signer acts independently through an approved provider.
- Binding terms, sending signature packets and external outreach require authenticated approval, contact consent and channel policy validation.
- Money movement and settlement are the responsibilities of authorized parties and title/escrow providers, not NEO agents.

Official references:
- https://statutes.capitol.texas.gov/Docs/OC/htm/OC.1101.htm#1101.0045
- https://statutes.capitol.texas.gov/Docs/PR/htm/PR.5.htm#5.0205
- https://www.trec.texas.gov/agency-information/rules-and-laws/trec-rules
- https://statutes.capitol.texas.gov/Docs/BC/htm/BC.322.htm

## Evidence package
Contract and legal interest: property, source timestamp, seller authority, executed purchase/option contract, verified assignor rights, assignment clause, expiration, counsel review, seller written disclosure.

Buyer and terms: opted-in buyer identity, market/asset fit, maximum all-in acquisition price, written disclosure to buyer, verified funds, approved fee, counsel-reviewed assignment agreement and any necessary seller consent.

Closing: authenticated human approval, approved title/escrow provider, separately signed assignment, verified settlement statement, verified receipt of assignment fee, immutable audit history.

## Runtime API
`server/neo-flipper/core.mjs` exports `validateDeal`, `scoreBuyerMatch`, `rankBuyers`, `evaluateFlipGates`, `estimateAssignmentEconomics`, `toDealDeskOpportunity`, and `proposeNextAction`. All are pure; no outbound calls or data mutation.

`toDealDeskOpportunity` returns `{normalized,opportunity}` compatible with the existing `server/neo-deal-desk/dashboard.mjs` input shape. **This is a proposed handoff, not a persisted CRM write.**

Evidence references and boolean verification fields supplied to this pure module are *untrusted claims* until validated by a separate authenticated provider adapter. Production must independently authenticate NEOpass principals, document signatures, escrow callbacks and disbursements. Never store private contracts, KYC files or proof-of-funds in public GitHub or unrestricted logs.

## Gates
1. Reviewed branch and tests, no production modification.
2. Texas counsel signs off contract and disclosures; clarify title, seller consent, brokerage and licensing.
3. Connect vault, NEOpass, genuine attestations, e-sign vendor, independent escrow and protected Deal Desk persistence.
4. Validate buyer/source registry consent, outbound suppression, duplicate callbacks, expiring rights, forged evidence, revoked signatures and escrow failures in isolated staging.
5. Authorized rollout after monitored staging success and documented rollback.

**Next milestone:** authenticated Deal Desk persistence adapter and real external provider contract tests. No live solicitation, signatures or payments before approval.
