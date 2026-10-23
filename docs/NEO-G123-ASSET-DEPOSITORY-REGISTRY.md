# NEO Gate 123 — Sovereign Asset Depository, Registry & Transfer Fabric

Gate 123 creates a community asset system of record for Bitcoin-native, Counterparty, Crown, and off-chain registered assets.

## System roles

- Tokenworks: asset utility, token-controlled access, address proof, issuer/asset workflows.
- NEO Pass: authenticated human/service identity.
- NeoMask: self-custody signer/security surface; private keys remain local.
- NEO Guardian: risk/security signals and policy enforcement.
- NEO Counter / ETHA: merchant, terminal and device-facing asset/payment interfaces.
- Gate 122: clearing/netting/settlement instructions and finality evidence.
- Gate 123: asset master, issuer register, holder/beneficial-owner records, custody-account abstractions, transfer-agent state, corporate actions and device/vault bindings.

## Ownership truth

NEO distinguishes:
- protocol ownership observed on Bitcoin/Counterparty;
- registered-holder records;
- beneficial-owner records;
- self-custody address control;
- external-custodian records.

These are related but not interchangeable. A wallet address balance is not automatically a legal beneficial-ownership determination; an internal register is not automatically external legal title.

## NeoMask and self-custody

NeoMask may bind as an external signer/security device. Gate 123 stores identity/device bindings and public references, never seed phrases or private keys.

Browser-extension and universal web-plugin capabilities should be built as a separate NeoMask application/security gate on top of this asset registry, with NEO Guardian integration, transaction simulation/warnings, site permissions, phishing/domain intelligence, and Counterparty-aware signing.

## ETHA and physical devices

ETHA Cards, terminals, POS hardware, security devices, and physical/bank vault devices can bind to custody-account and asset records using Gate 115 identity and Gate 116 secret/custody controls. A physical device binding does not itself prove legal custody or ownership.

## Authority boundary

This is a community depository/registry/transfer architecture. It is not represented as a statutory securities depository, registered transfer agent, bank custodian, broker-dealer, or government authority unless separately verified.
