# NEO VPN — First Administrator Enrollment

This gate is used only after NEO VPN Node 001 has been provisioned successfully.

## Security model

- The administrator private key is generated on the administrator device.
- Only the administrator public key is transferred to Node 001.
- The server private key remains on Node 001.
- The first administrator peer is reserved as `10.144.10.10/32`.
- No private WireGuard key belongs in GitHub, chat, tickets, email, or shared storage.

## 1. Read the server public key

On Node 001:

```bash
sudo cat /etc/wireguard/server.pub
```

Never read or copy `/etc/wireguard/server.key` outside the gateway.

## 2. Generate the administrator client locally

On the administrator device with WireGuard tools installed:

```bash
export VPN_ENDPOINT="NODE_001_PUBLIC_IP:51820"
export SERVER_PUBLIC_KEY="NODE_001_SERVER_PUBLIC_KEY"
bash services/neo-vpn/scripts/generate-admin-client.sh
```

The command creates a local `neo-vpn-admin/` directory containing:

- `private.key` — secret; device-local only
- `public.key` — safe to provide to Node 001
- `admin.conf` — secret because it contains the private key

## 3. Enroll the public key on Node 001

Copy only the contents of `public.key` to Node 001 and run:

```bash
sudo env \
  PEER_PUBLIC_KEY="ADMIN_PUBLIC_KEY" \
  PEER_IP="10.144.10.10/32" \
  bash services/neo-vpn/scripts/enroll-peer.sh
```

## 4. Activate the client

Import `admin.conf` into the local WireGuard client or use `wg-quick` where supported.

The default client is split-tunnel and protects only `10.144.0.0/16`. Do not change it to `0.0.0.0/0` unless full-tunnel operation is intentionally approved and tested.

## 5. Run the live acceptance gate

After the client connects and produces a handshake, run on Node 001:

```bash
sudo env \
  ADMIN_PEER_PUBLIC_KEY="ADMIN_PUBLIC_KEY" \
  ADMIN_PEER_IP="10.144.10.10/32" \
  bash services/neo-vpn/scripts/live-acceptance.sh
```

Node 001 is declared **live** only when the acceptance command reports `PASS` and the administrator independently confirms intended private-route connectivity.

## 6. Test revocation

A production acceptance test must confirm that access disappears after revocation:

```bash
sudo env \
  PEER_PUBLIC_KEY="ADMIN_PUBLIC_KEY" \
  bash services/neo-vpn/scripts/revoke-peer.sh
```

Verify the client can no longer reach NEO VPN routes. Re-enroll the approved public key only after the revocation test succeeds.

## Required evidence for live status

Record only non-secret evidence:

- Node 001 public endpoint
- server public key fingerprint/public key if operationally needed
- administrator public key
- assigned peer IP
- acceptance result and timestamp
- recent handshake timestamp
- revocation-test result
- reboot/persistence-test result

Never record private keys.
