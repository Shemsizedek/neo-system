# NEO-EFAX-017 — Bitcoin evidence, NEO Wire / NVSN mesh integration

**Status:** source-only, review required. This gate extends draft PR #1446 on an isolated branch, not production. No carrier calls, NVSN dispatch, Bitcoin broadcasts, account creation, payment, or live mesh enrollment.

## Verified architecture being reused
- NVSN canonical: `data/nvsn/nvsn-conversation-canon.md`, `registry/nvsn-cross-system.yaml`, `src/nvsn/types.ts`, `src/nvsn/router.ts`, `src/nvsn/telegram.ts`.
- NEO Wire: `src/wire/engine.ts`, `src/wire/services/network.ts`. Phone-number / wallet resolution and telecom provider connections remain gated.
- Noogle Fi: `src/noogle-fi/router.ts` (SIP/PSTN, SMS/MMS, WebRTC, NVSN/mesh routing). A READY software bridge is not proof of a live peer, carrier account or authenticated operation.
- NeoTele eSIM pilot: PR #975, no live carrier or SIM provisioning.
- NEO VPN two-device pilot: `docs/global-neo-ip/NET-008-FIRST-MESH-ACCEPTANCE.md`; no two-peer encrypted live traffic certified.
- eFax foundation: draft PRs #1442, #1444 and #1446. PostgreSQL integration and backup restore still need real-world evidence.

## Proposed delivery architecture
1. NEOpass validates a server-side tenant-bound operator and authorized destination. Check recipient cryptographic key ownership and applicable consent.
2. Create a document locally, encrypt with reviewed authenticated encryption (e.g. XChaCha20-Poly1305 or AES-256-GCM with per-object keys and recipient key wrapping), then place ciphertext into an access-controlled, encrypted object store. **Crypto implementation not present in this gate.** Plaintext, PHI, customer identifiers, telephone numbers, URLs and storage paths must not enter on-chain commitments or public mesh envelopes.
3. Prepare the offline draft in `neo-telecom-bitcoin-bridge.cjs`. It accepts only an opaque encrypted-object reference, an SHA-256 digest of *ciphertext*, tenant-scoped request ID, logical NVSN nodes, and TTL. A random 32-byte salt domain-separates the draft commitment. **The local object reference remains private, not a routable NVSN payload.**
4. Sign the final transport envelope using a trusted NEO Identity / NEOpass identity issuer with keyId, signature verification, replay protection and recipient authorization. Integrate with the existing NVSN router and queue, not a parallel network. This gate only produces an UNSIGNED_UNROUTED intent and dry-run checklist.
5. The NVSN service will select authorized mesh / Internet / SIP gateways with store-and-forward ACKs, TTL, retries and route ACLs once real peers are proven. PSTN destination requires separately authorized SIP/PSTN fax gateway; an encrypted NEO-to-NEO document service can operate without PSTN.
6. Batch *only* blinded commitment leaves into a Merkle root for later Bitcoin proof. Keep salts, receipt records and membership proofs off-chain. Transaction construction, signing, fee spending, broadcasting, confirmation tracking and chain reorganization handling are future independently authorized gates. No SHA-256 digest alone proves original document authorship, actual sending, receiving or legal service.
7. Do not call delivery COMPLETE until verified peer/recipient acknowledgement and independent receipt evidence; do not call ANCHORED without a verified Bitcoin transaction and sufficient confirmations. A broadcast is evidence of anchoring, not itself a fax transmission or legal proof of service.

## Security and external dependencies
- Strictly separate internal-only NVSN encrypted exchange and real PSTN/SIP fax delivery. Existing Phaxio simulator remains disabled; a live PSTN carrier needs contractual/regulatory security review.
- No original fax content or salted commitment opening goes into OP_RETURN or other public metadata. The public root may still reveal that a timestamped batch exists; privacy review is mandatory.
- The two-device NEO VPN pilot requires real independent mesh peer authentication, route ACL deny tests, revocation and signed acknowledgements.
- PostgreSQL integration tests against disposable DB, backup/restore, tenant-level isolation, audit append-only privileges, and independent security review still precede any staging certification.
- Review US telecom, fax consent, record retention and sector requirements (including HIPAA where relevant) before external operation.
- No Bitcoin mainnet/testnet broadcast and no provider account or spending may be inferred from this code.

## Execution evidence
- `node --test services/neo-efax/neo-telecom-bitcoin-bridge.test.cjs` — ten focused test cases are committed; GitHub CI must verify actual execution.
- Existing root `npm test` includes `services/neo-efax/*.test.cjs`, so the new file is in the pull-request CI test selection.
- Source-only draft artifacts are not route signatures, on-chain receipts, database records or deployment evidence.

**Release gate: NO-GO.** Keep all stacked PRs in draft until successful DB+restore+mesh validation and reviewed service-by-service approvals.

Related: #1441, #1442, #1444, #1446; NEO Wire PR #232, NVSN PR #5 and NEO-CONNECT #1420–1423.
