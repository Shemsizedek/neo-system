# NEOPASS-019 — existing-member passkey enrollment

Added explicit linked-enrollment methods to the passkey account service. A server-owned resolver must return a verified canonical subject, provider issuer and stable provider subject, identity-service audience and authentication time less than five minutes old. The browser cannot nominate its own account. Resolver implementations must verify provider credentials and authoritative account mapping; this interface is not itself a Google verifier.

The registration ceremony is bound to the browser and verified identity. Completion consumes the challenge once, rechecks identity, verifies the real WebAuthn response and rechecks identity after verification before writing. The durable SQLite transaction records the provider link and credential under the existing canonical subject. Provider reassignment, disabled accounts and adding another credential through this initial migration path fail closed. Backup-credential management is separate future work.

No new role, first-account slot or service permission is assigned. Existing pinned first-account reservation remains separate and unchanged. A passkey login after restart returns the original canonical subject. Provider metadata is kept in the provider-link table rather than copied into the credential JSON.

21 targeted tests pass, including existing identity preservation with real WebAuthn verification, substitution/replay, freshness/audience verification, provider conflict transaction rollback, disabled-account denial, restart persistence, first-account pinning, protocol subset and access gate checks.

Release: code only. Runtime HTTP enrollment remains disabled and no live provider session resolver has been wired. No actual owner credential has been enrolled or account migrated. Durable Render service provisioning, real provider verification, authenticated enrollment HTTP flow, NeoMask bridge and portal integration remain required. No Google Cloud dependency was introduced.
