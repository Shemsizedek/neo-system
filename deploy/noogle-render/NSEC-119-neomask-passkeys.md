# NSEC-119 — NEO Mask Passkeys and automatic pairing

Live UX: 3-second polling after an initiated session, automatic waiting/approval/paired status, and live ping counts. A user does not need to click Check request status. Session expiry remains 30 minutes.

The NEO Mask panel checks availability of the browser WebAuthn platform authenticator. It **does not register a credential, enroll a device, authenticate a NEO Pass account or access biometric data**. Google Password Manager, Apple Passkeys, Windows Hello and other WebAuthn providers are potential authenticators when the relying party and credential server are implemented. Passkeys are generally RP-ID scoped and are not universally usable on arbitrary unrelated websites; cross-device availability depends on platform syncing or hybrid WebAuthn flows.

Production design: use rpId `connect.holytemples.org` for Connect credentials, verify WebAuthn challenges/origin and attested keys server-side, bind registrations to verified NEO Pass users, prevent replay and enforce revocation in a durable credential store. Cross-browser and cross-device synchronization comes from authenticators/providers, not an exported private key.

Bitcoin should anchor only a salted/batched audit commitment if approved, **never** biometric templates, public personal metadata, passkey private keys or raw credential IDs. Blockchain confirmation does not itself validate biometric ownership or replace WebAuthn signatures.

Persistent device terminals remain disabled until the companion agent, verified NEO Pass authentication and session authorization operate end-to-end.
