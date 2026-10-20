# Stewardship address roles — confirmed 2026-10-17
Incoming collection: 18SzD3cfwCcV9p6C38ho4uZPHE8ygVB9iq
Bond source / delivery signer: 1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8

A third wallet is not required by the application. The two roles can be addresses within one wallet or separate wallets. The application does not assume that an address alone proves signing control.

Plugin v0.11.0 is installed active. New private checkout records store collection_address and treasury_address as the collection address and token_source_address as the bond source. The public page identifies both roles. The World Currency catalog's separate original source treasury is preserved; its stewardship collection metadata is updated. Merchant signer identity checks intentionally continue to require the bond source, because that key signs delivery.

Historical checkout records are not silently rewritten. They remain non-payable preparation records.

Checks: bitcoinjs-lib validated both supplied addresses as Bitcoin-mainnet scripts; packaging checks verified split collection/source fields and absence of the ambiguous old treasury constant.

This configuration change does not enable collection, issue a payable QR, prove wallet possession, reconcile payment or deliver tokens. Production settlement and confirmed fulfillment remain separate release requirements.
