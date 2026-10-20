# NEO Counter 0.20.0 — retail interface correction

Retail checkout displays Pledge Bond and Temple Bond as short option labels. Member patronage and Adept commitment appear in the Asset information section below the calculator. The default preview explicitly selects Counterparty 2.0 and BTC. It uses live daily references and renders the one-unit result on the server; JavaScript updates quantities and refreshes quotes. Explicit Classic selection is preserved. No unavailable currency is substituted with BTC.

The default page previously required an unselected ledger before pricing could initialize. Wallet-provider and calculator module execution are now isolated; an unavailable wallet provider cannot prevent the calculator module from mounting. A failed background quote fetch preserves a still-valid existing reference, while expiry and authoritative unavailable rates still clear stale quotes.

The retail template has no merchant/treasury connection button for any role, including administrators. Only member NeoMask connection is offered. After connection the Connect action is hidden while Disconnect is shown. The retail wallet module no longer embeds an inventory-source address or binds treasury connection controls.

Treasury links and owner/issuer details are removed from the retail directory and public currencies response. Quote responses and inline pricing data whitelist only calculation/display fields; internal bond/currency market records remain server-side. Member invoice views exclude inventory-source and treasury market metadata while retaining the collection destination needed for payment. Operator diagnostics require manage_options.

Registry metadata is loaded from a guarded PHP file. The release ZIP excludes raw registry and audit JSON files. The historical source/audit records remain development evidence; this does not make already-public blockchain data confidential. Retail projection applies to the UI and API; it does not promise secrecy for on-chain addresses. Future Treasury connection interfaces belong in dedicated Treasury/wealth-management applications, never retail NEO Counter or NEO Bank screens. No NEO Bank deployment is changed by this plugin release.

Validation: native PHP/SQLite merchant and settlement tests; retail projection, protected diagnostic permission and server amount tests; catalog/directory tests; daily market tests; JS quote/wallet/search regressions; PHP syntax validation. No signing or transfer occurred. Payment collection and automatic delivery remain disabled.
