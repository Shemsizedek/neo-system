# NEO VPN Operations and Incident Response

This runbook governs NEO VPN Node 001 after provisioning. It does not authorize financial, treasury, CES, or deployment actions by itself; those systems retain their own application-level approvals.

## Routine status

Run:

```bash
sudo bash services/neo-vpn/scripts/status-report.sh
```

Review:

- `wg0` is present and listening on UDP 51820.
- `wg-quick@wg0` and `nftables` are active.
- IPv4 forwarding is enabled.
- Every approved peer has the expected narrow `AllowedIPs` value.
- Administrator peers that are expected online have a recent handshake.

A stale or never-seen handshake is not automatically an incident. Investigate it in context before rotating or revoking credentials.

## Peer drift audit

Run:

```bash
sudo bash services/neo-vpn/scripts/peer-audit.sh
```

The audit fails if the peer set in the live WireGuard interface differs from `/etc/wireguard/wg0.conf` or if duplicate `AllowedIPs` exist. Do not normalize unexplained drift by overwriting configuration; identify why it changed first.

## Peer compromise

If one device is lost, stolen, or suspected compromised:

1. Record the affected public key and assigned VPN address.
2. Run the existing `revoke-peer.sh` against that public key.
3. Confirm the peer no longer appears in `wg show wg0` or the persistent configuration.
4. Re-run `peer-audit.sh` and `status-report.sh`.
5. Generate a new device keypair locally on the replacement device.
6. Enroll only the replacement public key.

Do not rotate unrelated peers unless evidence supports broader compromise.

## Gateway compromise or unknown peer activity

If the gateway itself may be compromised, an unknown peer is present, configuration integrity cannot be established, or active abuse is suspected, disable the VPN data plane:

```bash
sudo bash services/neo-vpn/scripts/emergency-disable.sh
```

The script captures operational state beneath `/var/lib/neo-vpn/incidents/<UTC timestamp>/` and then stops `wg-quick@wg0`. It does not delete keys or configuration.

Use the Google Cloud console/IAP recovery path for investigation. Preserve evidence before rebuilding or rotating the server identity.

## Re-enable gate

Do not re-enable Node 001 until:

- the cause of the incident is identified or bounded;
- unauthorized peers are revoked;
- host integrity is established or the node is rebuilt from trusted infrastructure code;
- firewall rules match the approved configuration;
- server and affected client keys are rotated when required;
- `peer-audit.sh` passes;
- the live acceptance test passes again.

Then:

```bash
sudo systemctl start wg-quick@wg0
sudo bash services/neo-vpn/scripts/live-acceptance.sh
```

## Evidence and privacy

Operational evidence may include timestamps, public WireGuard keys, assigned private VPN addresses, service state, firewall state, and handshake age. Never place WireGuard private keys, application credentials, wallet secrets, CES credentials, cookies, tokens, or unrelated payload content into incident reports.

## Availability principle

Fail closed for the private network. During uncertainty, loss of VPN availability is preferable to retaining a potentially unauthorized administrative path.
