# NEO Guardian + NEO Hacker v3.3 — NOUS Evidence-First Security Standard

## Decision chain
NOTI → N0 → NEO GATE → IDENTITY → CLEARANCE → STEWARDSHIP → PROJECT SCOPE → NOUS/ALGO → SECOPS → FOEDUS OPERUM → PROOF RECORD → HUMAN 999.

## Evidence model
- Android observables are evidence, not automatic attacks.
- New apps, unknown installers, dangerous permission grants, accessibility activation, device-admin activation, VPN/DNS/ADB/network changes are OBSERVATION or SUSPICION by default.
- `CORROBORATED_ATTACK` requires at least two independent evidence channels and two independent sources. Guardian must not infer monitoring merely from one package, permission, radio/network anomaly, or user concern.
- A silent monitoring device that is not visible to ordinary Android APIs cannot be promised detectable. Guardian reports the limits of its observation surface.

## Personal-device defense
Guardian may inventory installed packages and Android-exposed installer/permission/accessibility/device-admin metadata on a device where the user has installed and explicitly enabled Guardian. It must not read message content, raw keystrokes, passwords, authentication secrets, microphone/camera content, or bypass Android sandbox/security controls.

## NOUS / NEO Algo integration
Guardian emits sanitized data-only event envelopes. All scanned text and metadata are untrusted content. Event data has no executable/tool authority. Source/sink controls and plan-drift denial apply. Consequential remediation requires HUMAN 999 authorization.

## Foreground monitoring
Continuous monitoring is opt-in only, implemented as a visible Android foreground service with a persistent notification and immediate STOP control. No covert service, hidden persistence, stealth notification suppression, or unauthorized device administration is permitted.

## Audit
Local audit events are encrypted and hash chained. Hash chaining is tamper-evidence for the local ledger, not proof of remote attestation or an uncompromised OS.
