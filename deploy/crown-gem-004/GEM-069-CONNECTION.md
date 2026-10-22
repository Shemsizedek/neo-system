# GEM-069 — Gemini Developer API ↔ NEO Staging Connection

## Working supported connection
Gemini Developer API function calling → deploy/crown-gem-004/gemini_runtime.py → gemini_adapter.py → authenticated NEO Crown staging read-only gateway → Bitcoin and Counterparty public verification APIs.

## Consumer Gem boundary
A consumer Gemini Gem is not an independently configurable HTTP tool runtime. Gemini App Gem instructions are not secrets storage or an API bridge. To make Gemini conversation + external NEO tools work, run the developer API client in NEO-controlled infrastructure.

## Verified staging procedures
1. Run the existing opt-in startup test toggles CROWN_GEMINI_TOOL_ON_BOOT and CROWN_GEMINI_BTC_ON_BOOT for a single staging deployment.
2. Review only sanitized structured logs for CROWN_GEMINI_TOOL_CHECK and CROWN_GEMINI_BTC_CHECK.
3. Disable test toggles after collecting results; never log API keys or bridge tokens.
4. Read-only functions only; no signing, transfers, issuance, or treasury routes.
5. A tool call and identity match do not prove independent financial certification.

## Deployment
Render web service: neo-crown-gem-staging, service srv-dbc19n1srm7s739a1br0; manual deployment from feat/crown-gem-003-staging-bridge. Keep credentials in Render environment variables.

## Gate outcomes
A successful Gemini API round trip proves the developer app bridge, not direct consumer Gem execution. Direct consumer Gem connectivity must not be claimed without an actual supported integration and independent end-to-end test.

## Fresh 2026-10-21 execution result
Staging build passed 63 automated tests. The opt-in startup Gemini-to-XCP function-call check returned `{\"ok\":false,\"error_type\":\"TimeoutError\"}`. This does **not** certify a fresh API round trip. The BTC test did not produce a confirmed success result when last checked. Startup test flags were set back to 0 via Render environment update (deployment status requires verification). Do not treat this as a consumer Gem connection. Next technical fix: decouple live Gemini probes from web-service startup, use a protected post-start request/one-shot job with bounded timeout and sanitized status, then retest.
