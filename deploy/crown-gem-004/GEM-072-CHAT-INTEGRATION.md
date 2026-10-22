# GEM-072 — Gemini NEO chat integration boundary

Observed live on Render: deployment dep-dbcdts0ae00c739eu2l0. Both post-start Gemini tool diagnostics reported tool_called=true for Counterparty and Bitcoin. This proves developer API tool calling but does not show an independently certified financial record.

The requested user-facing Gemini chat must run server-side: authenticated user session, per-user quotas, Gemini Developer API function declarations, allowlisted read-only NEO tools, and sanitized results. Never put GEMINI_API_KEY or CROWN_BRIDGE_TOKEN into browser JavaScript, Gemini Gem instructions, or repository source.

The current authenticated gateway does not expose a general conversational chat endpoint. Consumer Gemini Gems cannot be described as directly connected by this developer API integration. No public user login or chat UI has been deployed.

The startup diagnostic flag should be disabled in Render Environment: CROWN_GEMINI_POSTSTART_DIAGNOSTIC=0. Independently verify the resulting deploy before certifying cleanup.

Next: build an authenticated server-side chat route with identity and request limits, connect a private UI, then exercise XCP/BTC tools through an authenticated test client.
