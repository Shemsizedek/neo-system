# GEM-090 — Chat experience acceptance

Verified from user screenshot: the URL-fragment handoff prefills a read-only Counterparty XCP lookup, Google-authenticated NEO Gemini accepts the prompt, and the approved `neo_crown_counterparty_asset` function returns an upstream-reported result. This does not establish independent market-data certification.

Next UI changes: render assistant markdown safely as text/allowlisted elements, replace raw monospace blocks with responsive conversation bubbles, retain bounded messages during the active browser session, and preserve existing Google authentication, explicit Send, backend quotas, and read-only tool allowlists.

The current `gemini_runtime.run` resets conversation context on each request; do not describe it as persistent multi-turn memory. Any future history support must be per-session, bounded, confidential, and never rely on browser-supplied tool results as trusted evidence.

No changes to wallet signing or consumer Gemini Gem remote execution are authorized.
