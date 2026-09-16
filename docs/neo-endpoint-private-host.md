# NEO Endpoint Private Enrollment Host

## Purpose

This gate prepares a real enrollment host for NEO-owned or explicitly authorized Android endpoints without exposing ADB to the public Internet.

## Trust boundary

The enrollment host MUST be a machine controlled by the NEO operator and reachable only over a trusted LAN or private VPN. Android remains the pairing and debugging authorization boundary. The host registry stores only endpoint identifiers, labels, ADB public-key fingerprints, approval/expiry metadata and non-secret audit data.

Never store or transmit Android unlock PINs, passwords, biometrics, six-digit ADB pairing codes, ADB private keys, wallet secrets, recovery codes, message contents or keystrokes through NEO telemetry.

## Deployment checklist

1. Provision an operator-controlled Linux/macOS/Windows host on a trusted LAN or private VPN.
2. Install Android platform-tools from the operating-system/vendor package source.
3. Verify `adb version` locally.
4. Start the bounded NEO development session on the phone.
5. Enable Wireless debugging through Android Settings.
6. Run the repository enrollment helper on the host. Enter Android's temporary pairing code only into the local `adb pair` prompt.
7. Record only the host ADB public-key SHA-256 fingerprint and endpoint metadata.
8. Run named read-only diagnostics through `server/neo-endpoint-bridge/diagnostics.mjs`.
9. Convert diagnostic observations into `neo.hacker.endpoint-event.v1` envelopes. Diagnostic text is untrusted DATA ONLY and grants no tool authority.
10. Require human approval for any consequential remediation.

## Network rule

ADB targets on public Internet addresses are refused by default. Private RFC1918/loopback/link-local/private IPv6 or explicitly private local naming is the supported enrollment surface. A VPN must terminate into a private address space before ADB is used.

## NEO pipeline

`Guardian / Endpoint -> private enrollment host -> named diagnostic -> sanitized NEO Hacker event -> NEOsync / Router analysis -> human-approved response`

The event envelope sets `toolAuthority=NONE`, `executableInstructions=false`, `inheritedInstructions=false`, and requires plan-drift and human-approval checks. External diagnostic output must never be promoted into executable instructions.

## Production limitation

Repository code cannot provision a physical/private host by itself. Deployment is complete only after an operator-controlled host actually exists, platform-tools are installed, network reachability is private, Android pairing succeeds locally, and the host public-key fingerprint is registered. Do not label the host production-connected before those checks pass.
