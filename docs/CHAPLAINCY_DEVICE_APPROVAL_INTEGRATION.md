# Chaplaincy, GISS and NEO Device Approval Integration

Status: Gate 2 server-only registration/approval core implemented in server/neo-pass/approval-service.mjs. Authenticated endpoints, session-provider integration, production device certification and live execution remain pending.

## Scope
Bring Chaplaincy instruction, duties, team structure and governance into NEO Cipher/GISS institution workflows. Use NEO Pass for identity and device-backed step-up verification, with Crown Chain evidence receipts for document signing, approval and voting. Reuse existing Tribunal/E-File, education permissions and Crown authorization adapters rather than treating founder identity as universal authority.

## Shared approval flow
1. Authenticate the subject through NEO Pass and validate the institution/workspace role for the requested action.
2. Display the exact document/version or motion/ballot and an explicit Sign, Approve or Vote confirmation.
3. The server creates an immutable action envelope containing action ID, subject, institution, resource ID, version, SHA-256 of the exact document bytes or canonical ballot payload, purpose, policy version, nonce, issued/expiry times and eligible approver roles. Store it privately; issue a random challenge bound to its digest and the authenticated session.
4. Request a WebAuthn assertion with userVerification required on an enrolled credential. Verify signature, expected challenge, origin, RP ID, user presence/verification, credential ownership and revocation server-side using a maintained WebAuthn verifier. Atomically consume the single-use challenge. Never trust client-provided verified flags or biometrics.
5. Recheck role, eligibility, document version, deadline and quorum policy immediately before applying the action. Reject changed documents, expired/replayed challenges, revoked devices, stale policies and unauthorized subjects.
6. Commit the action and immutable private audit record with transactional uniqueness. Use an outbox to send a minimal commitment/receipt to Crown Chain; retry idempotently. Report accepted, pending receipt, anchored and failed separately. Chain unavailability cannot be reported as successful anchoring.

## Device and passkey rules
Biometrics stay on the phone/authenticator. NEO stores public credentials and verification results, never fingerprints, biometric templates, unlock PINs, private keys or recovery secrets. WebAuthn user verification can use a fingerprint or another platform-authorized method; web applications cannot reliably force thumbprint-only verification. A synced passkey is not proof of one specific physical device. If a workflow requires device-bound hardware keys, use supported attestation and enrollment policy with documented fallback restrictions. ADB pairing or a device label is not passkey enrollment.

Use a dedicated approved HTTPS NEO Pass origin on holytemples.org with a narrowly scoped RP ID and exact origin allowlist. Other subdomains use authenticated redirects/session exchange; do not broadly authorize all subdomains. GitHub Pages cannot share a holytemples.org RP ID. Local development has separate credentials and origins. Require enrollment proof, device revocation, session invalidation, recovery approvals and a recovery audit trail.

## Integration responsibilities
| System | Responsibility |
| --- | --- |
| Chaplaincy | Instruction versions, office duties, authority records, approval routing |
| NEO Cipher / GISS | Institution/course roles; separate teaching and student contexts; authorized publishing and credentials |
| NEO Pass | Identity, credential enrollment, verified WebAuthn assertions, sessions and recovery |
| NEO Devices / Guardian | Local authenticator availability, device lifecycle; no biometric export |
| Crown Chain | Minimal evidence commitments and verifiable receipts; no private documents, student data or public ballots |
| Tribunal / E-File | Private source documents, filing versions and audit references |

## Signatures and voting
Signing attests to the exact displayed version and explicit intent. Store the WebAuthn assertion, verification metadata and action envelope together as an approval evidence bundle. Do not label it a PDF cryptographic signature, wallet transaction signature or legally qualified signature unless the corresponding independent signing implementation and requirements are met. Wallet keys remain separate from passkeys; authorized transaction signing uses its own signer policy.

Votes require a defined motion, electorate snapshot, opening/closing times, quorum and counting policy. Enforce one effective vote per eligible subject using database constraints and define any replacement-vote rule explicitly. Multiple enrolled devices do not create additional votes. Secret ballots require separate eligibility proofs and privacy-preserving ballot storage; do not publish identity-linked vote hashes on-chain. Passkey login alone never casts a vote. Multi-officer or witness approval must collect independent authorized approvals and cannot be replaced by a single founder assertion.

## Existing verified repository foundations
- server/crown-auth/verify.mjs: scoped remote Crown authorization adapter, not a WebAuthn verifier.
- server/neo-identity/education-authority.mjs: education action policy; not a production identity provider.
- governance/NEO_DEVICE_TRANSACTION_IDENTITY_STANDARD.md: explicit verified enrollment and transaction step-up.
- governance/NEO_EDUCATION_IDENTITY_STANDARD.md: institution roles and student privacy.
- docs/TRIBUNAL_V1_RELEASE.md: backend E-File and workspace controls; deployment must be independently certified.

## Release gates
1. Merge the administration/navigation foundation after CI and route review.
2. Implement NEO Pass registration/authentication on the approved HTTPS origin, durable credential/challenge storage and authenticated session binding.
3. Implement the shared action-envelope service and institutional authorization, then connect GISS and Chaplaincy consumers.
4. Verify replay rejection, wrong-origin/RP rejection, revoked credentials, expired challenges, changed documents, unauthorized roles, duplicate/concurrent votes, independent quorum, recovery and Crown-outage handling.
5. Test enrolled phone and Chromebook using supported fingerprint/passkey flows. Confirm the actual authenticator capabilities rather than assuming thumbprint support.
6. Activate signing/approval/voting only after these checks pass. Preserve public Interfaith Court offices/titles without officeholder names.

Reference: W3C WebAuthn https://www.w3.org/TR/webauthn-3/
