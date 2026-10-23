# Gate 125 — NeoMask Live Signer & Guardian Security Network

Gate 125 establishes the control plane for real NeoMask signing devices and the transaction firewall that precedes any signature request.

## Governance

NEO records its internal governance as a self-regulated community framework under its Natural Law doctrine. Where NEO interfaces with an outside jurisdiction, merchant/acquirer, exchange, custodian, infrastructure provider, or regulated counterparty, the external interface must still satisfy applicable requirements. Internal governance and external-interface compliance are separate layers.

## Signer model

Supported signer classes:
- mobile hardware-backed keystore;
- hardware wallet;
- desktop secure signer;
- ETHA device;
- dedicated NeoMask device.

The NEO control plane stores public signer identity and device metadata only. It does not ingest seed phrases or signing private keys.

## Pairing

NeoPass / Gate 115 device identity should authorize a short-lived pairing challenge. The device proves possession of its signing identity before NeoMask treats it as paired.

## Guardian transaction firewall

Before signing:
1. evaluate origin/domain reputation;
2. simulate and inspect the Bitcoin/Counterparty transaction;
3. verify signer availability;
4. require user presence;
5. send the request to the paired device-local/hardware signer;
6. keep broadcast as a separate action.

## Domain reputation

The local policy engine supports HTTPS checks, suspicious-domain patterns, phishing reports, new-domain signals, and allowlist signals. Live threat-intelligence feeds are not claimed until connected.

## Distribution

Gate 125 prepares the signer/security architecture for Chrome, Firefox and Edge packaging. Browser-store publication remains unverified until actual store submission and approval occur.
