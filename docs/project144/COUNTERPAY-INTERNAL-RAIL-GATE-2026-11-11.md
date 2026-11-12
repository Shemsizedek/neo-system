# Project 144 — Counterpay internal rail for NEO eGaaS

## Verified integration points
- Counterpay public DNS: `counterpay.holytemples.org` has a CNAME to `custom-domains.chatgpt.site` according to the WordPress-managed DNS zone. It does **not** resolve to the identified Render NEOpay staging service by that configuration. This alone does not establish which app is actually deployed on ChatGPT Sites.
- Existing eGaaS branch / PR #1346: `feat/egaas-bitcoin-anchor-preparation-20261107`. Its `prepareEgaasAnchor` makes a deterministic Crown Merkle batch with `prepared_offchain` state. Its separate verifier requires Bitcoin Core inclusion and two independent Counterparty observations before verification. PR #1346 remains unmerged.
- Agent address proposal PR #1380 and local-wallet creation draft PR #1408 are also unmerged and **not** part of this branch.
- Existing NeoMask provider supports origin-scoped permission checks, simulations, Guardian policy and local/hardware signer requests. This gate does not use any signer.

## New implementation
`server/neo-platform-api/counterpay-internal-rail-core.mjs` accepts only up to 128 opaque, uniquely salted SHA-256 commitments accompanied by random UUIDv4 references, a strictly enumerated record class, and a privacy level. It reuses the parent eGaaS Merkle batch. The response contains record membership proofs, a candidate Counterparty broadcast text, and an explicit `prepared_offchain` state. No data is stored. The response is not a blockchain receipt.

`counterpay-internal-rail-http.mjs` adds `POST /api/v1/egaas/internal-rail/prepare`. The route requires a trusted NEOpass subject resolver and remains **disabled by default** through `createNeoPlatformApi({counterpayInternalRailEnabled: false})`. Application code may enable the *offline preparation route only* after authentication and policy review. No public environment toggle, signing, broadcast, asset issuance, funding, custody, or spend is included.

Record classes: IDENTITY, COURT_FILING, CALL_LOG, PROPERTY, MEDICAL, GOVERNMENT_REGISTRATION, AGENT_WORK, FINANCIAL_INTENT, EDUCATION, GENERAL. Certain classes enforce HIGHLY_RESTRICTED privacy. Classification is metadata for internal routing, **not proof of lawful authority**.

## Critical architecture boundaries
1. **Private custody:** records stay encrypted with access controls in the existing NEO Storage / eGaaS custody workflow. Do not hash unsalted names, emails, addresses, patient identifiers, filing numbers, phone logs, or other low-entropy identifiers directly onto Bitcoin. Real personal records have not been accepted or tested here.
2. **Anchoring:** Bitcoin provides consensus ordering and block inclusion evidence, not exact wall-clock notarization or legal recognition. A tiny BTC transfer is neither required nor automatically evidence of record inclusion. Use Merkle batching to minimize cost and metadata leakage. Only independent Bitcoin and Counterparty verifiers can advance a receipt to `verified`.
3. **eGaaS:** distinguish internal submission, external acceptance, legally effective filing, blockchain commitment and ownership. No private software deployment confers government agency authority, court jurisdiction or official land-title status.
4. **Agent wallets:** PR #1380 associates proposed public addresses with agents, but none are funded or verified for control. Distinct agent identifiers and wallets can later support metered internal work and approved transfers. Do not rely on addresses alone for authorization. Require worker identity, replay protection, limits, multi-party approval and audit trails.
5. **NeoMask:** use the existing origin-scoped permissions/Guardian simulation/device signer gateway. No secrets reach the eGaaS API. Signing authorization for any future publishing transaction requires a separate narrowly scoped capability and individual root approval.
6. **BVM/NVM:** reserve a deterministic execution interface for future rules (receipt validation, agent escrow intents, document workflow, registry transitions) in an isolated sandbox. No new VM execution, state commitments or arbitrary contract deployment is built or enabled here.
7. **Financial services:** no live payment activation, NOMNI issuance, banking, regulated custody or trading. Legal, privacy, healthcare, records-retention and financial compliance review is required.

## Tests and acceptance
- Local Node 22 tests: `node --test server/neo-platform-api/counterpay-internal-rail-*.test.mjs` — 10 passed, 0 failed on the isolated module copies.
- Tests cover bad payloads, personal-data fields, duplicate records/commitments, privacy classes, false anchor claims, default-disabled route, NEOpass enforcement, HTTP response headers and oversized requests.
- **Not verified:** complete parent eGaaS integration suite on GitHub head, actual Counterpay app code on ChatGPT Sites, browser HTTPS wallet creation/recovery, production auth, remote node inclusion, durable backup, VM functionality, or live transfers.
- **No production deployment, DNS mutation, signing or broadcast performed.**

## Next gate
1. Review/merge PR #1346 first (or rebase), validate full Node 24 eGaaS tests, and stage this branch against the same HTTPS platform API.
2. Bind the actual Counterpay Sites wallet runtime and verify its version, origin, code ownership and API permissions. Confirm the wallet issuance draft PR #1408 in an isolated HTTPS test environment before activating human issuance.
3. Build authenticated, durable, encrypted custody and distinct human/agent identity-to-address proofs; add revocation and audited authorization.
4. Run mock Bitcoin RPC + independent Counterparty verifier integration; require confirmed inclusion and correct root to advance receipts.
5. Perform healthcare privacy, land records and court-filing legal reviews before real records; stage NeoMask consent and narrow capability approval before any wallet signing or mainnet publishing.
