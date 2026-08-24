# Tribunal v1.5 — Certified Service Ledger & Proof Engine

This milestone adds recipient-level service tracking and a hash-chained service ledger to the NEO Tribunal backend.

## Capabilities

- Register each intended service recipient by claim, notice, destination, channel, and optional deadline.
- Record immutable service-attempt ledger entries with evidence hashes and communication/provider references.
- Track recipient status, last attempt, deadline, and recorded service time.
- Issue an internal proof-of-service certificate only after a recipient is recorded as served.
- Hash each proof payload and bind it to the current service-ledger head.
- Verify the complete service-ledger hash chain.
- Produce case-level service compliance summaries: served, pending, overdue, failed, and complete.
- Expose typed browser API methods for recipient, attempt, proof, compliance, and ledger verification operations.

## Schema v4

Adds `service_recipients`, `service_ledger`, and `service_proofs` tables plus claim/deadline indexes.

## Integrity model

Every service-ledger entry contains the previous entry hash and a SHA-256 hash over its normalized record. Evidence attached to a service attempt is itself reduced to an evidence hash before it is linked into the ledger.

## Legal boundary

A generated proof is expressly identified as an **internal Tribunal record**. The software does not represent that an internal certificate automatically satisfies statutory, court, treaty, diplomatic, or governmental service requirements outside the applicable recognized legal framework. External legal effect depends on the governing law and service rules.
