# NODE-010A — Local Linux / Codespaces Qualification

## Purpose
Use the same probe on:
- the user's local Linux environment;
- GitHub Codespaces;
- future independent Linux servers.

## Command
```bash
bash infra/neomail-staging/qualify-host.sh mailtest.holytemples.org
```

## Classification
The script produces one of these operational classes:

- `NEO_NODE_A_CANDIDATE`: persistent Linux with a detected public IPv4. Still requires external inbound TCP/25/443/465/993 evidence before promotion.
- `NEO_EDGE_NODE_PENDING_NETWORK`: usable Linux environment but public addressing is not yet adequate/verified.
- `NEO_CODESPACE_NODE`: ephemeral Codespaces node for build/test/control-plane work, not authoritative MX.

## Important architecture correction
Direct outbound TCP/25 is not required during the free-first phase. NEO Mail remote delivery uses the verified Resend SMTP smart host at `smtp.resend.com:465`.

## External acceptance
A host cannot prove its own public inbound reachability. Promotion to permanent Node A requires an external probe of TCP/25, 443, 465 and 993 after services are listening and the network/firewall is configured.

Titan production MX remains unchanged until the permanent node passes the full acceptance checklist.
