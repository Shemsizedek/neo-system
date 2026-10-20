# NOMNI-003

React/Vite, public read-only NOMNI market dashboard. No Treasury functions or wallet signing.

Run `npm install && npm run build` from this directory. Set `VITE_NOMNI_API_BASE` to the approved service origin or leave blank for same-origin requests. The existing NEO Edge contracts are `/nomni.json` and `/api/nomni/value`.

**Release blocker:** the existing NEO Edge source includes hardcoded fallback USD/XCP figures that can masquerade as market-observed data. This UI intentionally displays **Unavailable** instead of a live monetary quote until backend provenance is corrected and tested. DNS/Cloud Run mapping and TLS for nomni.holytemples.org require verification before deployment. Not deployed.
