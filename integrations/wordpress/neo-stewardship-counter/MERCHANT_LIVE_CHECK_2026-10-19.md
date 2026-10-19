# Merchant foundation production check — 2026-10-19

NEO Counter 0.18.0 is installed and active on holytemples.org. The live settlement endpoint reports transactional invoice storage and v3 storage-constraint checks passed. The live merchant endpoint reports token_sale, digital_goods, physical_goods and service_bill routing; private operator drafts support BTC/XCP. Anonymous invoice-verification POST returns 401. The public Holy Stewardship page still renders both bond choices without a PHP fatal error.

The operator form was rendered in the PHP test harness, with its nonce and capability guard checked. No authenticated production browser interaction or production merchant draft was created during this release. Native PHP/SQLite settlement and merchant tests, daily-market tests, JavaScript regression tests and PHP syntax checks passed. SQLite does not simulate InnoDB concurrent lock scheduling.

PaymentsEnabled=false, automaticDelivery=false, escrowAdapterConnected=false and digitalDeliveryConnected=false. The new Tokenworks settlement contract is a capability/validation boundary, not a funded escrow adapter. No payment, key, signature, blockchain broadcast, download grant, shipment or token delivery was made by these tests.

CounterTools naming note: CounterTools.io is the current explorer/data service linked on Counterparty's site. The older https://github.com/Jpja/CounterTools is a separate modular wallet/toolbox. Neither was installed or assumed to supply an operational escrow service in this gate. Actual protocol escrow must be verified independently of the brand/tool used to compose transactions.
