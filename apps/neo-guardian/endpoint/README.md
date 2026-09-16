# NEO Guardian Endpoint Bridge v3.4

This layer enrolls user-owned Android devices as protected NEO endpoints without creating a permanent unrestricted remote shell.

## What the Android app now provides

The `NEO Endpoint` console creates a random local endpoint ID, displays Android-exposed Developer Options / USB debugging / Wireless debugging posture, and lets the user start or end a bounded two-hour NEO development session. It routes the user back into Android's own Developer Options / Wireless Debugging authorization screens instead of bypassing them.

The app does not become an ADB client and does not silently enable debugging. Android remains the authorization boundary.

## Bootstrap

Android Wireless Debugging requires an ADB client on another authorized host. The six-digit Android pairing code is entered **locally into that ADB client** and is never stored in GitHub, NEOsync, Guardian, or chat logs.

Example on an authorized host with Android platform-tools installed:

```sh
bash scripts/neo-endpoint-adb-enroll.sh <phone-ip:pairing-port> <phone-ip:connect-port> personal-phone
```

Under the hood the helper runs:

```sh
adb pair <phone-ip>:<pairing-port>
# adb prompts locally for the six-digit code shown by Android
adb connect <phone-ip>:<connect-port>
adb devices -l
```

The pairing port displayed by Android's `Pair device with pairing code` dialog can differ from the normal Wireless Debugging connection port.

The enrollment helper refuses public-IP ADB targets by default, accepts only private/LAN-style targets, does not accept a pairing code as a command-line argument, and prints only the SHA-256 fingerprint of the host ADB public key as a safe registry value.

## NEO-VM distinction

The NEO-VM in the NEO Nous architecture is a reasoning/execution virtual machine, not automatically a provisioned network host. It may only act as an ADB host when deployed on a real reachable OS environment with Android platform-tools and network reachability to the Android device. Never expose an ADB port directly to the public Internet.

A future NEO VM enrollment station should connect to personal devices through a private LAN or an explicitly approved private VPN/tunnel. Public Internet ADB is prohibited by policy.

## Endpoint states

- `NORMAL`: debugging is not active outside an approved session.
- `DEV_SESSION`: user explicitly authorized a bounded development session and USB or Wireless debugging is active.
- `WARNING`: debugging is active outside the approved session.
- `HIGH`: reserved for unexpected debugging plus corroborating security evidence from other Guardian/Hacker signals.
- `CRITICAL`: reserved for independently supported security events; a setting change alone is insufficient.

## Trust boundaries

- Explicit user pairing/enrollment only.
- No password, PIN, biometric, pairing-code, ADB private-key, seed phrase, or session-secret collection.
- Authorized-host registry stores fingerprints/metadata only.
- Named defensive diagnostics are preferred over arbitrary shell execution.
- No covert monitoring, persistence, privilege escalation, or silent device administration.
- Consequential remediation requires explicit authorization.
- Audit events are attributable and tamper-evident where supported.

## Fleet model

Each personal device receives a unique endpoint ID and its own enrollment record. Do not reuse Android identifiers as authentication credentials. Hardware/network identifiers are private endpoint metadata and must not be committed to the public repository.
