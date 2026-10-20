# NEO Counter 0.21.0 live interaction verification

Plugin installed active and page 2010 re-saved to invalidate the host page cache. In the live public Chrome browser, two Pledge Bonds displayed 0.00109000 BTC. The Update estimate button was tested by pointer and keyboard: it showed Updating estimate, returned that total and retained Quantity=2 without navigating/reloading; replaceState updated only the selected ledger/currency URL parameters.

NeoMask opened a chooser listing Horizon Wallet, XCP Wallet, Freewallet.io, Counterpay and NEO Pay. This browser had no compatible injected wallet providers, so these were correctly reported as not detected. No live wallet approval, signature, send or account import occurred. Horizon and XCP provider adapters and declared versioned NEO bridge registration passed contract tests. Freewallet/Counterpay/NEO Pay still require a compatible provider/bridge in the member's browser; this release does not fabricate or install one.

The browser initially had a Temple Gate modal and push notification overlay covering pointer interactions. They were dismissed for interaction testing; their site-wide settings were not changed. Cookie choices were not accepted. The resulting calculator was captured for verification. Local JS/PHP/SQLite/regression tests passed. Collection and automatic delivery remain disabled.
