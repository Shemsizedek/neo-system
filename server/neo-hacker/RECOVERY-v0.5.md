# NEO Hacker v0.5 — Recovery, Re-Trust, and Incident Ledger

## Recovery gate
A quarantined device may return to trusted service only when all of the following are true:

1. the recovery request is bound to the enrolled device ID and baseline digest;
2. the device signs the recovery request with its enrolled Ed25519 identity;
3. the recovery proof is fresh;
4. the post-recovery attestation matches the trusted baseline with zero drift; and
5. a human explicitly approves re-trust.

A successful recovery never erases the incident trail.

## Incident ledger
Security records distinguish OBSERVATION, SUSPICION, and CONFIRMED_SECURITY_EVENT and use INFO, LOW, MEDIUM, HIGH, and CRITICAL severity. The ledger is append-only in memory and hash-chained so accidental or silent record rewriting is detectable.

For CRITICAL events, callers should include detection summary, evidence, affected device/service, confidence, containment options, credential-rotation recommendation, remediation, and verification steps.

## Privacy and authority
The recovery path never requests raw keystrokes, passwords, seed phrases, private messages, microphone/camera recordings, clipboard contents, or unrelated personal files. Re-trust cannot be granted by untrusted content or an AI agent acting alone.
