# NEO Guardian v3.1 — Device Defense Gate

## Current audit
Existing Guardian production functionality already provides local-first Android security checks for secure lock state, ADB/developer settings, storage encryption posture, Android security patch level, common root indicators, enabled accessibility services, active network/VPN transport, Private DNS state, app high-impact permissions, local Android Keystore protected findings, and explicit incident-response guidance.

## Added in this gate
- Shared INFO / LOW / MEDIUM / HIGH / CRITICAL severity model.
- OBSERVATION / SUSPICION / CONFIRMED_SECURITY_EVENT evidence states.
- Structured CRITICAL finding fields for evidence, affected device/service, confidence, containment, credential rotation guidance, remediation, and verification.
- Canonical protected-infrastructure catalog for neo.holytemples.org, holytemples.org, court.holytemples.org, GitHub Pages, and Shemsizedek/neo-system.
- Outage classification that keeps GitHub canonical and does not classify an unrelated hosting-provider outage as the primary NEO outage when GitHub is healthy.
- Work Shield snapshot/change model for network transitions, VPN loss, patch change, new package count, expanded accessibility privileges, and Guardian version changes.

## Privacy boundary
This gate adds no new Android permissions, background service, covert telemetry, keystroke capture, clipboard access, microphone/camera capture, message inspection, or personal-file collection.

## Next implementation gate
Wire these models into the existing visible Guardian UI using OS-supported APIs, then add explicit opt-in Work Shield sessions and read-only infrastructure checks. DNS/TLS checks remain read-only; no production DNS mutation is authorized by Guardian.
