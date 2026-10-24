# NTEL-015 — Free eSIM Device Pilot Provider Catalog

This catalog separates consumer eSIM trials, Lifeline referrals and operator API access. None grants Noogle Telecommunications commercial carrier credentials or authority to issue profiles.

## First-device candidates (provider terms checked October 2026)
- Verizon Free Trial: 30 days, compatible unlocked eSIM phone, no credit card; https://www.verizon.com/plans/free-trial
- T-Mobile Trial: 30 days, eligible non-T-Mobile customers, unlocked compatible eSIM phone, T-Life app; https://www.t-mobile.com/offers/free-trial/
- US Mobile trial: 30 days, new customer with an eligible number transfer/port-in; https://www.usmobile.com/get-started
- Lifeline referral list from earlier planning: TruConnect, AirTalk Wireless, Life Wireless. Subscriber must qualify through official verification; eSIM availability and geography require carrier confirmation.

Provider terms and eligibility can change. Never infer an open carrier API from an advertised consumer trial, nor market someone else's trial as a Noogle-issued NeoTele line.

## Device pilot
1. User independently confirms eSIM support and unlock status using official provider compatibility flow; never collect full IMEI in public logs.
2. User independently registers with the external carrier and downloads its legitimately issued eSIM.
3. NEO Wire may store a privacy-preserving service-status receipt after explicit consent, **not** the carrier QR/profile secrets.
4. NEO Guardian and NeoMask may bind a nontransferable draft service entitlement; blockchain publication requires a separate approval.
5. Noogle Fi may monitor user-permitted network quality, but cannot control an external carrier account or provision new profiles without authorized APIs.
6. NEO AI may recommend network use and detect faults; it cannot change carrier or terminate service autonomously.

The catalog, evaluator and tests are source committed; no actual phone activation, provider account enrollment, or carrier service contract is performed.
Run `node --test server/neotele/*.test.mjs` in the project root.
