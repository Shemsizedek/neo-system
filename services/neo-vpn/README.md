# NEO Virtual Private Network (NEO VPN)

NEO VPN is the private-network security layer for the NEO System. Its purpose is to protect authorized administrative traffic, internal APIs, service-to-service communications, development access, and sensitive operational interfaces.

## Security model

NEO VPN is designed around WireGuard and a zero-trust access model:

- encrypted tunnels between approved NEO devices and gateways
- per-device cryptographic identity
- least-privilege network routes
- deny-by-default access to administrative services
- separation of production, administration, development, and public traffic
- key rotation and immediate peer revocation
- no passwords, private keys, recovery secrets, or seed phrases committed to Git
- auditable configuration changes through pull requests

## Initial network plan

| Zone | CIDR | Purpose |
| --- | --- | --- |
| NEO VPN Core | `10.144.0.0/16` | Private overlay network |
| Gateways | `10.144.1.0/24` | VPN gateways and routing nodes |
| Admin | `10.144.10.0/24` | Authorized executive/admin devices |
| Services | `10.144.20.0/24` | Internal NEO APIs and services |
| Bots | `10.144.30.0/24` | Authorized NEO automation workers |
| Development | `10.144.40.0/24` | Development/test systems |

These are private RFC1918 addresses and can be changed before production if they conflict with an existing network.

## Architecture

```text
Authorized device
      |
      | WireGuard encrypted tunnel
      v
+-------------------+
| NEO VPN Gateway   |
| 10.144.1.1        |
+-------------------+
      |
      +----> Admin zone
      +----> Internal APIs
      +----> NEO service network
      +----> Bot workers

Public Internet traffic remains separately controlled by routing policy.
```

## Repository layout

- `docker-compose.yml` - gateway container scaffold
- `.env.example` - non-secret deployment variables
- `config/wg0.example.conf` - example WireGuard configuration only
- `docs/SECURITY.md` - operating and key-management policy

## Production gate

This repository contains infrastructure configuration, not a magically active VPN. A real VPN requires a reachable Linux host or VM with UDP ingress, WireGuard support, firewall/NAT configuration, DNS/routing policy, and device keys generated outside GitHub.

Before production:

1. Provision the NEO VPN gateway host.
2. Restrict SSH/admin access and patch the host.
3. Generate server and client keys on trusted machines.
4. Store deployment secrets in the host secret store or approved CI secret manager.
5. Configure firewall rules and only the routes each peer needs.
6. Test DNS leaks, kill-switch behavior, peer isolation, revocation, and recovery.
7. Add monitoring without logging sensitive payloads.

## Scope boundary

NEO VPN protects traffic and access paths. It does not replace application authentication, encrypted storage, backups, endpoint security, repository permissions, or secure software-development practices.
