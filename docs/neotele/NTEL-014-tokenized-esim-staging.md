# NTEL-014 — NeoTele Bitcoin-Linked eSIM Staging Certification

## Architecture
A conventional GSMA-certified carrier-issued eSIM (eUICC + local profile assistant + authorized SM-DP+) supplies actual radio-network access. Noogle Telecommunications/Noogle Fi orchestrates authorized provider integrations. NEO Guardian/WebAuthn authorizes account actions. NEO Crown Chain/Counterparty may separately record *pseudonymous service entitlement commitments*, consent/ownership evidence and audit attestations. NEO AI may recommend service or network choices, detect anomalies and explain costs, **never autonomously expose profile secrets, sign transactions, activate service, terminate emergency calling or bypass human/device authorization**.

This is not the first cellular network powered by Bitcoin: a Bitcoin ledger cannot itself supply cellular radio access or issue a GSMA-valid profile. Describe the project as **Bitcoin-linked mobile service management**, not Bitcoin replacing an MNO.

## Implemented
- Composed existing Guardian proof gate and existing NEO Evidence Vault `getEvidence` interface with trusted document-byte SHA-256 verification.
- Chaplaincy NEOpass/membership gate before staging certification.
- Draft entitlement record with pseudonymous commitment; not minted or published to blockchain.
- Explicit no-activation barrier and test cases.

## Security
Keep EID, ICCID, IMSI, MSISDN, activation codes, QR payloads, biometric templates and wallet private keys OFF public blockchains. Even a deterministic hash of a guessable identifier can compromise privacy; use salted or keyed commitments where required. Transaction publication and token transfer are not safe defaults for nontransferable phone subscriptions. Store actual eSIM credentials only in approved provider systems.

## Still blocked
Adapters are dependency-injected test contracts, not real running Guardian/WebAuthn or Evidence Vault document-loader integrations. No actual Crown Chain anchoring, carrier API, SM-DP+, test profile or operator credentials have been verified. Staging HTTP route is not mounted and CI not certified. Device's eSIM slot being empty proves only availability of a slot, not carrier compatibility or profile issuance.

## Certification checklist
1. Connect NEOpass and verified Guardian challenge/session adapters to staging with no client-supplied verified flags.
2. Wire restricted document-byte loader and validated Evidence Vault review authority.
3. Apply reviewed persistence migrations with separate privileges and immutable audit evidence.
4. Verify carrier agreement, GSMA provisioning, emergency services, coverage, funding and subscriber consent.
5. Run e2e tests on an eligible test device using only a carrier-issued test profile.
6. Approve merge/deploy separately; do not activate subscriber line through this gate.

Official technical references: https://www.gsma.com/solutions-and-impact/technologies/esim/about/ ; https://source.android.com/docs/core/connect/esim-overview .
