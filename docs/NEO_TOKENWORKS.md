# NEO Tokenworks and Neopass — Origin Architecture

NEO Tokenworks is the Bitcoin/Counterparty utility layer for NEO Services. NEO Banks is its first institutional consumer. This release provides executable sandbox domain logic for shared access, address-proof challenges, and escrow planning. It does **not** custody assets or compose, sign, or broadcast mainnet transactions.

## Two lending modes

| Mode | What moves | Enforcement | Origin state |
|---|---|---|---|
| Neopass shared access | Usage permission only | Signed wallet proof + Tokenworks policy | Lease issue/revoke implemented; signature verifier pending |
| Time-locked escrow | Counterparty asset | Bitcoin/Counterparty transaction workflow | Plan-only; composition disabled |

Neopass may suspend the owner's platform entitlement while granting it to a borrower, but this does not alter Counterparty ownership. Tokenworks must re-check ownership/balance and authentication under the entitlement policy.

## Historical and technical clarification

Counterparty predated Ethereum and its protocol has long supported timed financial contracts: open orders expire after a user-selected block count and escrowed Counterparty funds return when the order expires; bets use deadlines and escrow. That is native Counterparty protocol behavior.

That evidence does not establish a general native primitive for temporarily transferring any Counterparty asset to a borrower and automatically returning it. A modern rental design therefore needs an explicit enforcement model:

1. **Protocol-native expiry**, only where a current Counterparty message type actually provides the needed semantics.
2. **Bitcoin Script enforcement**, such as CLTV/CSV and multisig, after confirming the selected Counterparty asset/UTXO representation remains valid through every spend.
3. **Automation with multisig**, where a watcher composes a return transaction. This is operational enforcement, not the same as consensus-enforced return.

Counterparty 2.0 UTXO support is the preferred research path because it attaches assets to Bitcoin UTXOs. Before production, prove the complete state transition on Counterparty regtest, including premature spend rejection, borrower use, expiry return, reorg recovery, and indexer agreement.

## Tokenly evidence

Tokenly's public tools catalog documents:

- Tokenly CMS: address proof of ownership, Counterparty token tracking, token-controlled access, distribution, redemption, participation reporting, forum/community, and API integration.
- SwapBot: watched vending addresses, configurable confirmation depth, fixed/dynamic rates, token issuance, forwarding, and multiple machines.
- BitSplit: scheduled and persistent distributions.
- Tokenpass Client: application authentication integration.

The reviewed public catalog supports token-controlled access and address proof. It does not, by itself, substantiate the more specific claim that Tokenpass temporarily revoked an owner's access during every loan. NEO Tokenworks implements that as an explicit configurable policy, not as an attributed historical fact.

## NEO Banks production gates

1. Challenge message schema, wallet signature verification, nonce consumption, session binding.
2. Counterparty Core v2 balance and event adapters; configurable confirmation depth and reorg rollback.
3. Durable append-only lease/audit store with idempotency keys.
4. Regtest escrow prototype using UTXO-supported Counterparty assets.
5. External signer/PSBT flow; no seed phrase or private-key ingestion.
6. KYC/vendor integration only where the applicable product and jurisdiction require it.
7. Sanctions controls, consumer disclosures, dispute handling, tax records, custody and money-transmission analysis.
8. Securities classification before offering lending, yield, fractional interests, or tokenized claims. The SEC states that token format does not change the application of federal securities laws.

## API

- `GET /health`
- `GET /api/v1/tokenworks/capabilities`
- `POST /api/v1/neopass/challenges`
- `POST /api/v1/neopass/leases`
- `POST /api/v1/neopass/leases/:id/revoke`
- `POST /api/v1/tokenworks/escrow-plans`

No route currently composes, signs, broadcasts, or transfers assets.
