# NEO Mail — Bring Your Own Node Contract

## Objective
Any NEO-controlled Linux host may become a mail node if it satisfies this contract. The service identity belongs to NEO, not to a cloud vendor.

## Roles
- Node A: primary independent Stalwart host.
- Node B: independent failover Stalwart host.
- Titan: temporary legacy/primary inbound during migration.
- Resend: verified outbound smart host and temporary backup inbox.
- GitHub: portable source/configuration.
- Bitcoin/Counterparty: optional provenance anchoring only.

## Hard acceptance requirements
A candidate node MUST provide:
1. a stable public IP address;
2. inbound TCP/25 reachable from the public internet;
3. inbound TCP/443, 465 and 993;
4. durable storage;
5. DNS controlled by NEO;
6. a supported Linux environment capable of running the committed Stalwart container;
7. firewall administration;
8. evidence that the provider/ISP does not silently proxy or rewrite SMTP;
9. a backup path independent from the compute provider.

## Outbound policy
Direct outbound TCP/25 is **not required** during the free-first phase.

All remote delivery may route through the verified Resend smart host using TLS on TCP/465. This makes providers that block outbound TCP/25 usable for NEO Mail, provided they allow **inbound** TCP/25.

## Desirable, but not initially blocking while relaying outbound
- administrator-controlled PTR/rDNS;
- IPv6;
- dedicated static IPv4;
- provider-level snapshots.

PTR/rDNS becomes mandatory before any node attempts direct-to-MX outbound delivery.

## Provider neutrality
No configuration may depend on a proprietary runtime feature that prevents migration to another Linux host.

Required portability:
- Docker Compose;
- environment-variable secrets;
- DNS names instead of provider-private hostnames;
- encrypted exportable mailbox backup;
- portable audit records;
- no cloud-provider IAM identity as the sole service identity.

## Node identity
Each node gets:
- unique node ID;
- hostname;
- public key/fingerprint;
- role A or B;
- last acceptance-test timestamp;
- software version;
- current public IP;
- inbound TCP/25 result;
- storage/backup result.

Never reuse the same private host identity key across independent nodes.

## Failover policy
Production MX may ultimately publish multiple mail exchangers only after both nodes pass independent inbound acceptance.

Until then:
- Titan remains production inbound;
- Resend backup forwarding remains available;
- Stalwart nodes remain isolated/staged.

## Acceptance tests
A node is eligible only after:
- public inbound TCP/25 test succeeds;
- Stalwart health passes;
- TLS certificate is valid;
- local mailbox receives an external message;
- outbound message through Resend is delivered;
- open-relay test fails;
- backup + restore passes;
- admin bootstrap port is not public.

## Funding rule
If a candidate node fails solely because a paid resource is required, record the exact requirement, exact amount, and free/community alternatives before activating any donation request.
