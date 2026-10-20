# NMASK-034 — Shared NeoMask wallet discovery for NEO Pay
Source-only rollout on a review branch. The new NeoMask Availability panel does not request or sign transactions, does not assert NEO Pass verification from a browser flag, and cannot mark payments settled.
A future server-authenticated integration must provide a verified identity token and independently authenticated provider permission grants.
The read-only bridge specifies protocol neomask.bitcoin.v1 and networks bitcoin, signet and regtest.
Run focused tests with `node --test src/neopay/neoMaskBridge.test.mjs apps/neo-counter/src/neomask/bridge.test.mjs`.
Do not ship to production until existing NEOpay signing paths, checkout authorization boundaries, app builds, and end-to-end tests have been reviewed.
