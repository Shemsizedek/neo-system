# NEO Counter Ecosystem Checkout Gateway

NEO Counter is the shared checkout surface for NEO applications and ecosystem platforms.

## Stable frontend

`https://shemsizedek.github.io/neo-system/neo-checkout/`

The legacy/register route remains available at `/neo-counter/`.

## Browser adapter

Load:

`https://shemsizedek.github.io/neo-system/neo-checkout/neo-checkout.js`

Then redirect:

```js
NEOCheckout.redirect({
  service: 'neo-miner',
  orderId: 'contract-123',
  label: 'NEO Mining Contract',
  amountCents: 12500,
  rail: 'BTC',
  successUrl: 'https://example.com/order/contract-123/success',
  cancelUrl: 'https://example.com/order/contract-123'
});
```

Supported rail hints are `BTC`, `XCP`, `NOMNI`, and `USD`. USD is display/manual mode and does not produce cryptographic settlement proof.

## Direct redirect contract

The checkout route accepts these query parameters:

- `checkout=1`
- `amount` — positive integer minor units (USD cents)
- `service` — calling NEO platform/service identifier
- `order` — caller order/reference ID
- `label` — customer-facing line-item description
- `rail` — optional payment rail hint
- `success_url` — optional HTTPS return URL
- `cancel_url` — optional HTTPS return URL

Example:

`/neo-checkout/?checkout=1&amount=12500&service=neo-miner&order=contract-123&label=NEO%20Mining%20Contract&rail=BTC`

## Settlement boundary

The redirect URL, `neo_checkout=success`, payment ID, amount, service ID, order ID, and all caller-provided query parameters are untrusted presentation data. They are not proof of settlement.

For BTC/XCP/NOMNI checkout, NEO Counter uses its read-only network observation rails. A downstream platform must independently verify the returned blockchain/reference identifier and its required confirmation policy before delivering irreversible goods, services, credits, securities, mining contracts, or other value.

NEO Counter does not place private keys, seed phrases, raw cardholder data, or server-side signing material into GitHub Pages.

## Platform adoption

Every NEO service should use a unique stable `service` identifier. Recommended identifiers include `neopay`, `neo-teller`, `neo-exchange`, `neo-miner`, `neo-generator`, `neo-wire`, `neo-prime`, `neo-books`, `neoscan`, `noogle`, `neo-enterprise`, and future NEO applications.
