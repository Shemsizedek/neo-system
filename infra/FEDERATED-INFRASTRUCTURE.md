# NEO Federated Infrastructure Policy

## Principle
NEO infrastructure must remain decentralized and portable across multiple independent providers. No single cloud, Git host, runtime, database, or mail provider is authoritative for the whole system.

## Current provider roles

### GitHub
Role: primary source repository, Codespaces development lab, Actions/Pages where useful.

NEO Mail:
- Codespaces is approved for reproducible Stalwart development and integration testing.
- Codespaces is not the permanent MX node because its lifecycle/network identity is development-oriented.

### GitLab
Role: independent source mirror, CI/CD verification lane, disaster-recovery repository, alternate issue/release evidence.

Current connector/account state:
- authenticated GitLab account is active;
- account can create projects;
- no NEO project was found through the connected GitLab project listing at this gate.

Target:
- mirror the critical portable NEO infrastructure tree;
- run independent CI tests against commits/releases;
- maintain enough repository history and manifests to recover if GitHub is unavailable.

A GitLab mirror must never contain secrets, private keys, enrollment tokens, mailbox contents, or production credentials.

### Render
Role: HTTP runtime, control plane, stateless services, dashboards, staging, APIs, metadata and other services compatible with Render networking.

Verified connected state:
- two NEO Render workspaces exist;
- both contain active NEO services;
- existing deployments already use GitHub source.

Render is not designated as the sole production mail exchanger or sole state authority.

### SentinelX
Role: cross-provider machine management and operational control.

SentinelX may manage:
- physical NEO-owned machines;
- cloud VMs;
- temporary Codespaces labs;
- future mail nodes;
- other supported Linux/macOS/Windows hosts.

Host identity and deployment identity must remain portable and provider-neutral.

### Resend
Role: verified outbound email transport and forwarding-based backup inbox during the free-first mail migration.

### Titan
Role: existing production inbound mail during transition only.

### Stalwart nodes
Role: independent NEO-controlled mail infrastructure.

Target:
- Node A on provider/host 1;
- Node B on a different provider/host/failure domain;
- optional Node C/community node later.

At least two independent nodes should exist before Titan is considered removable.

## Failure-domain rule
Critical NEO functions should not depend on two services that share the same practical failure domain.

Examples:
- GitHub source + GitHub Codespaces are useful but are one provider family.
- Render runtime + GitHub source creates useful separation but still requires source recovery.
- GitHub + GitLab repository copies create source-provider redundancy.
- Stalwart Node A + Node B should be on different hosting/network providers.

## Data classes
1. Public code/config: GitHub + GitLab mirror.
2. Runtime state: replicated/exportable; never trapped in one provider.
3. Secrets: provider secret stores or host-local secret stores; never committed.
4. Mailboxes: encrypted backup independent of active compute host.
5. Audit/evidence: hashes, signed manifests and optional Bitcoin/Counterparty anchoring.
6. Databases: exportable backups and provider-independent schema/migrations.

## Promotion model
Development -> Codespaces/GitHub
Independent CI -> GitLab
HTTP/control plane -> Render + alternate runtime where useful
SMTP/mailbox -> independent Stalwart Node A/B
Operations -> SentinelX across providers
Outbound mail -> Resend
Legacy inbound -> Titan until migration acceptance

## Acceptance rule
No provider is called a production dependency until:
- its role is explicitly defined;
- failure and export procedures are documented;
- credentials are independently controlled;
- a recovery path exists;
- another provider or self-hosted path can assume the critical role.

## Cost rule
Prefer free/community tiers for staging, CI, replication, monitoring and secondary nodes where technically safe. Do not accept a paid dependency merely to preserve a vendor-specific architecture. Funding requests remain narrow, exact and evidence-backed.
