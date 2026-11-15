# NEO Federated Infrastructure Map

## Principle
NEO must not depend on a single provider, repository host, runtime, mail vendor, or control plane.

The system is divided across independent failure domains so one outage does not disable the whole ecosystem.

## Current roles

### GitHub
- primary source repository for `Shemsizedek/neo-system`;
- Codespaces development and integration labs;
- public issue/evidence ledger where appropriate;
- portable infrastructure source.

### GitLab
- independent private source mirror for Project 144;
- independent CI validation lane;
- container/package registry option;
- current CI blocker: GitLab account requires identity verification before shared CI jobs can run.

Verified mirrored NEO Mail files:
- `.gitlab-ci.yml`
- `README.md`
- `infra/neomail-staging/NODE-CONTRACT.md`
- `infra/neomail-staging/ACCEPTANCE.md`
- `infra/neomail-staging/CODESPACES.md`
- `infra/neomail-staging/FREE-REPLACEMENT-PATH.md`
- `infra/neomail-staging/docker-compose.codespaces.yml`
- `infra/neomail-staging/stalwart-resend-smarthost.example.json`

### Render
- independent HTTP/control-plane runtime;
- staging APIs, dashboards, postmaster surfaces and web services;
- existing free `neo-mail-postmaster-staging` service is present and not suspended;
- not the authoritative SMTP/MX host unless future networking evidence proves all mail-node requirements.

### SentinelX
- host enrollment;
- remote operational control;
- service/file/command management on enrolled nodes;
- independent of GitHub/Render runtime execution;
- not itself the compute provider.

### Resend
- verified outbound mail transport;
- SMTP smart host over TLS/465;
- backup receiving inbox;
- not the sole mailbox/storage authority.

### Titan
- temporary production inbound MX during migration;
- remains unchanged until independent NEO Mail nodes pass acceptance.

### NEO Mail Node A / Node B
- independent Linux/Stalwart hosts;
- separate identities and failure domains;
- must satisfy public inbound TCP/25, durable storage, TLS, firewall control, backup/restore and open-relay acceptance.

### Bitcoin / Counterparty
- optional immutable evidence/provenance anchoring;
- hashes/Merkle roots and non-sensitive metadata only;
- never mailbox bodies, passwords or private keys.

## Federation policy
1. No provider is authoritative for the entire NEO System.
2. Source must exist on at least two independent repository/control planes for critical services.
3. Runtime services must remain portable across Linux/container environments.
4. Secrets never synchronize through Git.
5. Mail transport, mailbox storage, source control and operational control remain separable.
6. Production DNS cutover requires independent acceptance evidence.
7. Free/community capacity is preferred before paid capacity.
8. Paid recovery or expansion requires an exact documented blocker and amount.

## Current NEO Mail state
- GitHub source: active.
- GitHub Codespaces lab config: committed.
- GitLab Project 144 mirror: active.
- GitLab CI: pending identity verification.
- Render postmaster staging: present, free plan, not suspended.
- Resend outbound: verified.
- Resend backup inbox: direct receipt test passed.
- Titan production inbound: retained.
- Titan-to-Resend duplicate forwarding: not yet observed.
- crown-node-001: offline.
- replacement Node A: not yet connected/qualified.
