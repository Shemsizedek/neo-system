# NEO-AUS-004 — Ausarian Economics route acceptance

## Branch preview routes
- `/ausarian-economics`: MB/M0–M9 classification explorer, CES capital references, simulation and flags.
- `/economics-101`: first GISS Economics 101 lesson entry (same component; not yet a native GISS course enrollment).

## Local validation
1. `npm ci` using the repository lockfile and Node 24.
2. `npm run build` to verify TypeScript and Vite compilation.
3. `npm run dev`; open both routes, including on a narrow mobile viewport.
4. Change every simulation input; verify results and warning flags, and confirm no network calls authorize transactions.
5. Check accessibility: keyboard class selection, form labels, readable warning text.

## Release gates
- CI build and browser acceptance: NOT YET VERIFIED.
- GISS enrollment / gradebook / course navigation: NOT YET INTEGRATED.
- NEO Oracle service endpoint: NOT YET INTEGRATED; shared evaluation gateway is source-level only.
- Private authenticated preview: NOT YET PROVISIONED.
- Real market feeds, transfers, custody, token issuance: DISABLED / NOT IMPLEMENTED.

## Source boundaries
All MB–M9 values are internal NEO classifications, not verified reserve balances or official monetary aggregates. Simulator outputs are educational and must not be treated as credit or investment decisions.
