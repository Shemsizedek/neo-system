# NEO Oracle — Decentralized Synthetic Intelligence (DSI)

Status: v0.1 bootstrap

## Purpose

NEO Oracle DSI is the NEO System's decentralized synthetic-intelligence architecture. It is not a single model and it is not an on-chain LLM. It is a networked cognitive system in which specialized reasoning, retrieval, simulation, critique, memory, and policy agents cooperate off-chain while Bitcoin provides a root of trust for cryptographic identity, attestations, timestamping, audit commitments, and economic security.

Core principle:

> Compute off-chain. Verify and anchor on Bitcoin.

A second invariant is equally important:

> No single model is NEO Oracle. The network is NEO Oracle.

## NEO definition of Synthetic Intelligence

Within the NEO System, Synthetic Intelligence means engineered cognition produced through coordinated reasoning, learning, simulation, memory, autonomous agents, tools, verification, and adaptive interaction rather than dependence on a single pretrained model or a single human-derived knowledge stream.

This definition is an internal engineering category. It does not claim that SI is already a universally standardized scientific category, and it does not imply biological or wetware computation unless a future implementation explicitly adds that substrate.

## System roles

- **NEO Oracle** — distributed intelligence and judgment layer.
- **NEO Algo** — core reasoning, scoring, inference, and algorithmic evaluation.
- **NEOsync** — orchestration of tasks, agents, workflows, and state transitions.
- **NEO Router** — policy-aware routing across models, tools, nodes, and data sources.
- **NEO Crawler** — provenance-aware public/authorized acquisition, extraction, normalization, and indexing.
- **NEO Law** — authorization, governance, policy, jurisdiction, and consequential-action controls.
- **NEO Hacker** — defensive security, integrity monitoring, prompt-injection defense, red-team, and incident-response layer.
- **Bitcoin / Counterparty** — settlement, timestamping, cryptographic commitment, identity, and audit substrate.

## Cognitive pipeline

1. A request enters through NEOsync.
2. NEO Router classifies task, risk, sensitivity, and required capabilities.
3. Independent specialist nodes execute one or more roles:
   - researcher / retriever
   - probabilistic reasoner
   - symbolic or rule-based reasoner
   - simulator
   - planner
   - critic / adversarial reviewer
   - verifier
   - domain specialist
4. NEO Law evaluates authorization and policy constraints.
5. The result is accepted only after the configured consensus threshold is met.
6. A canonical attestation record is generated.
7. Attestations are batched into a Merkle tree.
8. The Merkle root is anchored to Bitcoin.
9. Full records remain off-chain in the NEO audit store; Bitcoin stores only the cryptographic commitment and related minimal metadata.

## Consensus model

The bootstrap default for consequential Oracle decisions is `3-of-5` independent node attestations. This is a policy default, not a hard-coded permanent rule.

Node diversity should be favored over identical replicas. A quorum can combine different model families, reasoning methods, vendors, local models, deterministic code, or human review where appropriate.

Consensus must not mean "majority always equals truth." The protocol must preserve disagreement, confidence, evidence, and minority reports for audit.

## Knowledge acceptance rule

Generated content is not automatically knowledge.

A candidate statement may move through the following states:

`generated -> sourced -> challenged -> corroborated -> verified -> accepted`

The Oracle should retain provenance, confidence, source lineage, contradictory evidence, and unresolved uncertainty.

## Bitcoin Root of Trust

The Oracle Bitcoin Root of Trust (OBRT) provides:

- signed release manifests for models and policies
- node identity commitments
- timestamped state checkpoints
- attestation-batch commitments
- tamper-evident audit history
- optional economic bonds / penalties
- future compatibility with proof systems such as optimistic verification or succinct proofs

Bitcoin must not be used to expose private prompts, private records, secrets, model weights, or sensitive user content. Only commitments, hashes, identifiers designed for disclosure, and minimal public metadata should be anchored.

## Security boundaries

- Heavy inference remains off-chain.
- Secret material must never be committed directly to the chain.
- Hashes must use canonical serialization to avoid ambiguous commitments.
- Node credentials should be short-lived and least-privilege where practical.
- Consequential actions require explicit NEO Law authorization.
- Prompt-injection and tool-chain policy checks occur before privileged tool execution.
- Every accepted result must be attributable to a versioned policy, model/node set, and attestation bundle.

## Synthetic memory

NEO Oracle DSI should distinguish:

- episodic memory
- semantic memory
- procedural memory
- institutional memory
- provenance memory
- model/version history
- decision history

Memory entries must carry provenance, timestamps, access class, confidence, and retention policy.

## Future substrate independence

The DSI protocol is designed to accept additional compute substrates in the future, including neuromorphic hardware, deterministic simulation systems, specialized scientific engines, and potentially biological or bio-hybrid computation if such systems become technically and ethically appropriate.

The protocol does not assume any one substrate is authoritative by default.

## v0.1 acceptance criteria

The bootstrap is complete when the repository contains:

1. this architecture specification;
2. a canonical attestation schema;
3. a Bitcoin anchor manifest schema;
4. an implementation backlog for the first executable prototype;
5. CI validation for JSON schemas and canonical examples.

## Non-goals for v0.1

- storing prompts or private outputs on Bitcoin;
- claiming hallucinations are eliminated;
- claiming the network is "hack proof";
- launching a token;
- automatic custody or autonomous financial execution;
- wetware / biological computation.
