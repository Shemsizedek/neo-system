# Project 144 — NEO Private Naming Gate 1

Safe prototype of a **private**, not ICANN-delegated, `.neo` namespace. This is not a publicly accessible domain service.

## Run locally
Requires Node.js 20 or later.

```sh
node --test services/neo-private-names/registry.test.mjs
node services/neo-private-names/dns-server.mjs
# In a second terminal:
dig @127.0.0.1 -p 53535 core.neo A
```

Only 127.0.0.1:53535 may bind. Sample `10.144.20.10` / `10.144.20.11` answers are **illustrative** and do not represent provisioned hosts. An invalid or unknown private name fails closed. Non-`.neo` queries return REFUSED, not recursive public DNS. This is a prototype DNS wire parser; production needs a vetted server implementation, resilience, monitoring, DNSSEC or authenticated distribution, IPv6 strategy, EDNS and security hardening.

## Bitcoin model
`registryDigest(records)` generates a deterministic SHA-256 digest of canonical records. `anchorPayload(records)` creates the `NEONAME1:<digest>` string. `verifyBitcoinAnchor` is read-only and requires a caller-injected Bitcoin Core RPC function (`getblockchaininfo`, `getrawtransaction` with transaction indexing or wallet visibility). It requires mainnet, minimum six confirmations by default and an exact `OP_RETURN` match. No Bitcoin transaction is generated or broadcast and no wallet is connected. Mainnet anchoring costs real BTC fees and must be a separately approved step.

**Important:** A Bitcoin-anchored digest proves only that the digest appeared in a confirmed transaction. It **does not** establish registrant authorization or ownership. Any future name-claim, transfer, revoke and governance actions must additionally verify a purpose-bound wallet signature (e.g. BIP-322 via a reviewed verifier), NEOpass permission, anti-replay nonces and versioned state transitions before updates can be accepted.

## Integration plan
- Reuse NEO VPN addressing from `services/neo-vpn/README.md`, with approved resolvers over WireGuard and explicit leak testing.
- Reuse `server/neo-pki` trust-domain conventions after review; avoid treating its credential format as browser-trusted X.509.
- Provide ordinary browser access over separately authorized public `holytemples.org` subdomains, if appropriate, or provider-assigned `*.onrender.com` addresses.
- No DNS, TLS, firewall, VPN, Render deployment, WordPress, or public routing changes are performed by this branch.
- Because `.neo` is also a candidate for public delegation, treat all private uses as potentially colliding; never configure fallback to public DNS for private queries.

## Next gates
1. Review and merge prototype, then test against a local DNS client.
2. Add signer verification and a persistent, versioned registry with rollback and revocation.
3. Test two isolated VPN resolvers and verified nonleakage on real NEO devices.
4. Integrate read-only Bitcoin mainnet proof verification with existing Bitcoin Core.
5. Separately approve public gateway/TLS rollout. No spending or mainnet transaction without explicit approval.
