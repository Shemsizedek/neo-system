# Cherokee Trinity reference bridge

NEO-side metadata integration with [`kburrjr/cherokee-trinity-token-system`](https://github.com/kburrjr/cherokee-trinity-token-system), exposed through the existing NEO Tokenworks service. HALI, TSDU and WAYA remain partner-declared XPR Network references.

The active direction is retokenization on Bitcoin through Counterparty. The [migration toolkit and gates](../../docs/project144/CHEROKEE-TRINITY-COUNTERPARTY-RETOKENIZATION.md) cover proposed 1:1 quantities, source retirement, existing-name ownership and issuance prerequisites.

The reviewed manifest is in [`registry/partners/cherokee-trinity.json`](../../registry/partners/cherokee-trinity.json). It records the exact upstream commit and SHA-256/Git fingerprints of three documents. No partner code or documents are vendored or executed.

See the [Project 144 register, API contract, verification commands and next gate](../../docs/project144/CHEROKEE-TRINITY-BRIDGE.md).

```bash
npm run neo-tokenworks:test
node scripts/verify-cherokee-trinity.mjs --live
node scripts/cherokee-retokenization.mjs --plan
node scripts/cherokee-retokenization.mjs --preflight
```

This integration provides read-only references. Live balances, identity federation, signing, transfers, swaps, custody and settlement are unavailable.
