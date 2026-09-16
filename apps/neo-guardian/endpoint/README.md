# NEO Guardian Endpoint Bridge v3.4

This layer enrolls user-owned Android devices as protected NEO endpoints without creating a permanent unrestricted remote shell.

## Bootstrap

Android Wireless Debugging requires an ADB client on another authorized host. The six-digit Android pairing code is entered **locally into that ADB client** and is never stored in GitHub, NEOsync, Guardian, or chat logs.

Example on an authorized host with Android platform-tools installed:

```sh
adb pair <phone-ip>:<pairing-port>
# adb prompts locally for the six-digit code shown by Android
adb connect <phone-ip>:<connect-port>
adb devices -l
```

The pairing port displayed by Android's `Pair device with pairing code` dialog can differ from the normal Wireless Debugging connection port.

## NEO-VM distinction

The NEO-VM in the NEO Nous architecture is a reasoning/execution virtual machine, not automatically a provisioned network host. It may only act as an ADB host when deployed on a real reachable OS environment with Android platform-tools and network reachability to the Android device. Never expose an ADB port directly to the public Internet.

## Endpoint states

- `NORMAL`: debugging is not active outside an approved session.
- `DEV_SESSION`: user explicitly authorized a bounded development session.
- `WARNING`: debugging or endpoint posture changed outside the approved session.
- `HIGH`: unexpected debugging plus corroborating security evidence.
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
