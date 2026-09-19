# NEO Oracle DSI — v0.1 Implementation Backlog

## Gate 1 — Canonical protocol artifacts

- [x] Define DSI architecture and terminology.
- [x] Define canonical node attestation schema.
- [x] Define Bitcoin anchor manifest schema.
- [ ] Add canonical serialization rules.
- [ ] Add example attestation and anchor payloads.
- [ ] Add JSON schema validation to CI.

## Gate 2 — Local consensus prototype

Build a non-custodial local service that:

1. accepts one normalized Oracle task;
2. dispatches it to at least three independent mock/specialist nodes;
3. records each signed attestation;
4. computes quorum without deleting disagreement;
5. emits an accepted-result record plus minority reports;
6. builds a deterministic Merkle root from the attestation set.

Default policy: 3-of-5 for consequential decisions, configurable by NEO Law policy.

## Gate 3 — Bitcoin integration on regtest/signet

- Start with Bitcoin regtest for deterministic development.
- Add a Bitcoin Core RPC adapter behind a narrow interface.
- Anchor only batch commitments; never raw prompts, secrets, private data, or full model outputs.
- Verify transaction inclusion and store the resulting txid/block metadata in the anchor manifest.
- Move to signet only after deterministic tests pass.

## Gate 4 — Node identity and registry

- Define node identity document and key-rotation rules.
- Require versioned node capabilities and policy permissions.
- Separate signing identity from privileged infrastructure credentials.
- Add revocation and quarantine state for compromised nodes.

## Gate 5 — NEO Router / NEO Law integration

- NEO Router selects eligible cognitive roles and providers.
- NEO Law determines quorum, tool permissions, data classification, and human-approval requirements.
- NEO Hacker performs prompt-injection, integrity, and tool-chain checks before privileged execution.

## Gate 6 — Production hardening

- append-only audit storage
- signed release manifests
- deterministic canonicalization
- replay protection
- timestamp/nonce policy
- rate limits and abuse controls
- structured observability without leaking sensitive content
- disaster recovery and node-key rotation drills
- adversarial consensus tests

## Safety and governance invariants

- The protocol must never describe itself as infallible or hack-proof.
- Consensus is evidence of agreement, not proof of truth.
- Generated hypotheses remain distinguishable from verified knowledge.
- Consequential actions remain approval-gated unless a narrowly scoped policy explicitly authorizes automation.
- Mainnet anchoring is not enabled by default.
- Financial custody and autonomous asset transfer are outside the DSI v0.1 scope.

## Immediate next implementation gate

**Gate 2A: canonical serialization + deterministic Merkle test vector.**

Deliverables:

- canonical JSON serialization specification;
- sample five-node attestation bundle;
- deterministic leaf-hash ordering rule;
- Merkle root test vector;
- verifier test that reproduces the same root from the same bundle.
