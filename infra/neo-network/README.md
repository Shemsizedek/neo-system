# NEO Sovereign Network Fabric

Gate 114 connects attested NEO compute and storage nodes through a provider-neutral private network control plane.

## Network model

- Overlay range: `10.144.0.0/16`
- Internal service namespace: `*.estate.neo`
- Overlay transport target: WireGuard-compatible encrypted tunnels
- Node identity: Gate 112 attestation plus public-key fingerprint
- Private keys: generated/stored only on the node or approved secret manager
- Public ingress: default deny
- Routing: health-aware with failover between eligible endpoints

The control plane creates peer plans and internal service records. It does **not** commit WireGuard private keys or silently change host networking.

## Activation on a physical node

A privileged node agent may consume an approved peer plan and render a local WireGuard configuration. Production activation still requires host-level authorization because it changes network interfaces and routes.

A node is routable only when:

1. its compute identity has been attested;
2. its overlay identity is unique;
3. its heartbeat is healthy;
4. the service registration is current;
5. any production route change has the required authority.

## Provider bridges

Cloud Run and other managed services can continue to communicate through authenticated HTTPS gateway adapters. NEO-owned VM/bare-metal nodes can use the encrypted overlay directly. This allows hybrid operation while the Estate transitions toward owned infrastructure.
