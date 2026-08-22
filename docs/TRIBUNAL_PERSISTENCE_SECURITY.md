# NEO Tribunal v0.6 — Persistence, Security, RBAC and PDF Packets

This milestone adds client-side persistence and record-security controls to the Inner Bar Temple Tribunal workflow.

## Capabilities

- Persistent docket versions using browser local storage.
- Hash-chained version history so each filing references the prior docket hash.
- ECDSA P-256 audit signatures generated and retained by the local device.
- Signature verification for historical docket snapshots.
- Role-based access control for Grand Sheik, Judge, Clerk, Marshal, Reviewer and Viewer roles.
- AES-256-GCM encrypted evidence storage in IndexedDB.
- PBKDF2-SHA-256 key derivation with 210,000 iterations and per-file random salt.
- Evidence passphrases are never persisted by the application.
- Decryption/download of locally encrypted evidence only after the passphrase is supplied.
- Dependency-free generation of a real PDF opinion packet from the sealed packet preview.

## Security model

The current implementation is a single-device browser security boundary. IndexedDB and local storage persist on that browser profile. It is not yet a multi-user server, cloud evidence vault, hardware security module, or remote identity provider.

Role selection in this milestone is a UI authorization model intended to exercise policy boundaries. Production authentication must bind roles to authenticated identities rather than allowing local role switching.

The ECDSA signing key is generated with WebCrypto and retained in IndexedDB. It authenticates local docket snapshots; it is not a qualified electronic signature, governmental seal, or external certificate authority credential.

## Record model

A docket version contains the claim number, full case record, sequential version number, prior version hash, SHA-256 hash, ECDSA signature, public verification key and filing actor. Historical versions are not silently overwritten.

Encrypted evidence is stored separately from case metadata. The case record retains the exhibit fingerprint and metadata; encrypted bytes remain in the local evidence vault.

## PDF packets

PDF generation uses a small dependency-free PDF writer so the application can produce a downloadable opinion packet without adding third-party document dependencies. The generated packet includes the textual packet manifest and integrity data available in the Tribunal packet preview.

## Boundary

These controls strengthen internal record integrity, confidentiality, auditability and reproducibility. They do not by themselves create external court jurisdiction, police powers, military authority, diplomatic recognition, property title, banking authority, or binding legal effect outside an applicable lawful agreement or recognized jurisdiction.

## Next milestone

Recommended v0.7 scope: authenticated multi-user identities, server-backed encrypted storage, invitation/workspace controls, immutable server audit log, case intake forms, notice/service workflow, hearing calendar, and external signing-provider adapters.