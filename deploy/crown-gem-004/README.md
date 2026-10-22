# CROWN-GEM-004: Isolated Read-Only Staging

This is a staging bridge source, not a live deployment or a direct consumer Gemini Gem integration.

## Run
Python 3.11+:
```bash
python -m unittest discover -s deploy/crown-gem-004 -p 'test_*.py' -v
PORT=8080 python deploy/crown-gem-004/bridge.py
```

## Render staging
Repository: Shemsizedek/neo-system
Branch: feat/crown-gem-003-staging-bridge
Runtime: Python
Build command: python -m unittest discover -s deploy/crown-gem-004 -p 'test_*.py' -v
Start command: python deploy/crown-gem-004/bridge.py
Auto-deploy: OFF until review
Plan: free only if confirmed available with no unexpected charges.

Required secret: CROWN_BRIDGE_TOKEN (random high-entropy token at least 32 characters, configure in provider secret settings, never commit to Git).
Optional backend URLs: BITCOIN_API_BASE, COUNTERPARTY_API_BASE, CROWN_API_BASE (approved HTTPS origins).
Required for outbound calls: CROWN_ALLOWED_HOSTS (comma-separated exact approved DNS hostnames).

Do not expose public service before network egress controls, DNS rebinding mitigations, ingress throttling and scoped client authorization are independently reviewed. Current handler authentication is only a shared bearer-token minimum staging control. /health is also protected. Upstream responses are not independently verified.

Consumer Gems/Skills do not acquire tool access simply from these files. Gemini API developer clients can integrate via a controlled function-calling runner once service credentials and endpoints are established.

## Promotion checklist
1. Code review and green GitHub Actions.
2. Authorize exact upstream providers, lock outbound egress at infrastructure level.
3. Provision isolated staging and secret token without reusing Treasury credentials.
4. Validate canonical sample Bitcoin and Counterparty lookups end-to-end.
5. Verify rate limits, logging redaction, rotation and network policies.
6. Integrate supported Gemini developer API runner with server-side token storage.
7. Explicit release approval before any production promotion.
