# NSEC-110 — Action-bound WebAuthn approval gate (inactive)

This contract is not mounted on staging HTTP. `begin` and `authorize` operate only via trusted server-side callbacks.

- Bind every issued challenge to verified NEO Pass subject, registered WebAuthn credential, exact action, device target, canonical action payload, relying-party ID and origin. The `actionHash` is not an authentication secret.
- The actual WebAuthn verification callback must validate challenge, signed client data, origin, RP ID, user verification, registered credential and session ownership.
- Consume challenges atomically and apply the authorized action in one server-controlled transaction, or use a durable exactly-once authorization record. The present contract does not guarantee action execution or prevent a second independent API call.
- Restrict the action allowlist to list/rename/revoke. Signing, voting, device enrollment and remote terminal are separate privileges, all disabled.
- Never use browser-supplied subject, credential ID, action hashes, or `userVerified` as trusted proof.
- Actual issuer interoperability, durable challenge integration and end-to-end device testing remain required before routing.
