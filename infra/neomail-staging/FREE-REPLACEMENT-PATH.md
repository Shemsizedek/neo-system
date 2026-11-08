# NEOMAIL-001F — Free Replacement Path

## Decision
Do **not** pay to restore Google Cloud solely to recover mail hosting.

Use a free/community compute node for inbound mailbox hosting and use the already-verified Resend transport as the outbound smart host.

## Target topology
- Inbound MX: self-hosted Stalwart on a free/community VM.
- Local mailbox store: Stalwart.
- IMAP/JMAP/WebUI: Stalwart.
- Outbound delivery: Resend SMTP relay on port 465 with TLS.
- Source/configuration: GitHub.
- DNS identity: holytemples.org.
- Existing Titan: temporary independent inbound redundancy until NEO Mail passes acceptance.
- Bitcoin/Counterparty: optional evidence anchoring only; never store message bodies or credentials on-chain.

## Why this works
The free VM does not need direct outbound TCP/25 when all remote mail is routed through the verified smart host. It still needs public inbound TCP/25 so other mail servers can deliver mail to the NEO Mail MX.

## Stalwart relay design
Create a relay route named `resend-smarthost`:
- host: `smtp.resend.com`
- port: `465`
- protocol: SMTP
- implicit TLS: enabled
- username: `resend`
- password: supplied through a runtime environment variable or secret store

Route all non-local recipients through `resend-smarthost`.

Do not commit the Resend API key or SMTP password.

## Free-host qualification
A candidate free/community VM qualifies if it has:
1. stable public IPv4 or IPv6 accepted for MX;
2. inbound TCP/25 allowed;
3. durable storage;
4. TLS-capable 443/465/993 listeners;
5. DNS under NEO control.

PTR/rDNS is still desirable and required before attempting direct-to-MX outbound delivery. It is not a blocker while outbound delivery is relayed through Resend.

## Oracle Free Tier path
Oracle Always Free remains a candidate because its default outbound TCP/25 block can be bypassed architecturally by relaying outbound through Resend on 465. Before use, still verify:
- Always Free compute capacity exists in the selected region;
- a public IP is assigned;
- inbound TCP/25 is not blocked by tenancy/network policy;
- security lists/NSGs allow 25, 443, 465 and 993;
- durable volume and backups are configured.

## Google recovery rule
Historical Gmail evidence shows:
- Google scheduled a $99.13 debit for the Cloud billing account on or after 2026-10-05;
- the payment attempt was later declined for insufficient funds;
- the Cloud billing account was suspended;
- Project 144 was suspended;
- Project 144 was later downgraded to Firebase Spark ($0/month);
- Google billing alerts later showed a $100 monthly budget threshold had been reached.

The $99.13 figure is a historical attempted debit, **not a verified current payoff balance**. Do not activate a donor appeal for Google Cloud until the current amount due is verified and Google restoration is still necessary after the free replacement path is tested.

## Crown node correlation
SentinelX recorded `crown-node-001` disconnecting at 2026-10-24T03:17:50Z. Gmail records a Project 144 suspension notice at 2026-10-24T03:17:17Z. The 33-second timing correlation is strong circumstantial evidence that the Crown node may have depended on Project 144, but this is not yet definitive proof of host identity.

## Acceptance
This free replacement path passes when:
- a free/community VM is provisioned;
- inbound TCP/25 is confirmed externally;
- Stalwart is live;
- a test message is received into a local NEO Mail mailbox;
- outbound mail relayed through Resend is delivered and authenticated;
- Titan remains available during the test;
- no paid Google service is required for the successful test.
