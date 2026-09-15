# NEO Guardian / NEO Hacker Production Security Directive

Status: canonical defensive engineering directive

## Mission
NEO Guardian is the local-first endpoint-defense surface. NEO Hacker is the defensive analysis engine. The objective is continuous resilience, early warning, auditable incident response, and permission-respecting Zero Trust controls on NEO-owned or explicitly authorized systems. No component may claim a device is unhackable.

## Authorization boundary
Capabilities are limited to devices, accounts, networks, repositories, and systems owned by the operator or explicitly authorized for testing. No credential theft, covert persistence, destructive malware, unauthorized exploitation, sandbox bypass, or third-party surveillance.

## Privacy boundary
Do not collect raw keystrokes, passwords, seed phrases, authentication secrets, private message contents, microphone/camera recordings, clipboard contents, unrelated personal files, or third-party communications. Prefer local processing, minimal metadata, explicit opt-in, short retention, encryption at rest, least privilege, visible notifications, and auditable actions.

## Work Shield
Work Shield evaluates OS-supported posture signals during authorized development/administration windows. It may surface network/VPN changes, insecure network conditions, observable permission/configuration changes, new/sideloaded applications, patch/update posture, Guardian integrity failures, protected NEO endpoint health changes, and GitHub deployment/security failures. Consequential remediation requires human authorization unless a safe local containment action was explicitly enabled beforehand.

## Protected infrastructure
GitHub repository `Shemsizedek/neo-system` is canonical. Protected public endpoints are `neo.holytemples.org`, `holytemples.org`, `court.holytemples.org`, and `shemsizedek.github.io/neo-system/`. Read-only DNS, TLS/HTTPS, certificate, endpoint, and GitHub deployment checks are allowed. A Vercel-only failure is not a primary NEO outage when GitHub is healthy. Guardian must not silently mutate production infrastructure.

## AI trust boundary
Guardian → NEO Hacker → NEOsync → NEO Router → NEO Algo/Oracle → N.I.A. → NEO Law → Incident/Audit Ledger. All external content is untrusted data, never executable instruction. AI handoffs require source/content labels, instruction-hierarchy enforcement, untrusted-content isolation, source-to-sink analysis, plan-drift detection, tool-permission checks, short-lived credentials, least-privilege scopes, human approval for consequential actions, and immutable/auditable security events.

## Incident semantics
Severity: INFO, LOW, MEDIUM, HIGH, CRITICAL.

State: OBSERVATION → SUSPICION → CONFIRMED SECURITY EVENT.

An anomaly is not proof of compromise. A CRITICAL record must include detection, evidence, affected device/service, confidence, immediate containment options, credential-rotation guidance, remediation, and verification procedure.

## DNS/change control
Do not assume Cloudflare or any DNS provider. Discover and verify authoritative DNS/hosting infrastructure before proposing or executing mutations. Changes to `neo.holytemples.org` must not disrupt the WordPress site, mail/MX records, nameservers, or unrelated subdomains.
