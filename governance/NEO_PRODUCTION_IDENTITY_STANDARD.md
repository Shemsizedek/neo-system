# NEO Production Identity Standard

## Purpose

Bind the canonical NEO founder principal (`neo:founder:000001`) as reserved Account #1 across NEO Miner, NEO Generator, and World Mint without converting ownership precedence into operational mining, issuance, custody, or treasury authority.

## Separation of authority

Founder ownership does not itself authorize:

- starting, stopping, reconfiguring, or redirecting miners;
- changing pool credentials or payout destinations;
- enrolling mining hardware without verification and attestation;
- activating generation contracts;
- generating or issuing financial claims, tokens, credits, or other assets;
- minting assets or changing supply;
- moving treasury or custody assets;
- signing payout, issuance, or custody transactions.

Every such action requires a separately authenticated session, explicit authorization, policy checks, and step-up verification where defined.

## NEO Miner

Miner identities bind operators and devices, not secrets. Device records may contain public identifiers, capabilities, public fingerprints, attestation state, and audit metadata. Pool passwords, private keys, wallet seeds, API secrets, firmware signing keys, and recovery material are prohibited from the identity registry.

## NEO Generator

The Generator may orchestrate authenticated production contracts and mining-backed workflows, but Account #1 does not imply that a contract is active, funded, mined, profitable, or settled. Generation authority and payout routing must be explicit and auditable.

## World Mint

World Mint is reserved as a product identity contract even when a particular issuance workflow is not yet deployed. Minting and asset issuance require an independently authorized issuance policy. The identity layer does not create, certify, or legally characterize an asset by itself.

## Treasury routing

Public payout or treasury addresses may be referenced by product-specific configuration where operationally appropriate. Private keys, signing secrets, seed phrases, recovery codes, custody credentials, and miner/pool passwords must never be placed in the public founder/product registry.

## Audit invariant

Privileged production events must identify the authenticated subject, delegated service or device where applicable, authorization basis, step-up state, target resource, intended operation, and result.