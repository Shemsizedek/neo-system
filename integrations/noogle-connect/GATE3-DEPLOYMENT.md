# Noogle Connect — Gate 3 deployment evidence

Verified 31 October 2026, approximately 12:39 p.m. America/New_York.

**Locked staging is live. ChatGPT/Codex OAuth linking and device pairing are not
live.** The public URL exposes process status; protected MCP operations remain
unavailable until identity and database certification.

| Resource | Verified value |
| --- | --- |
| Workspace | Render NEO SYSTEM — `tea-dbhtkc8473hc73933img` |
| Service | `noogle-connect-mcp-staging` — `srv-dbj1ivh42hec73bpi5q0` |
| URL | https://noogle-connect-mcp-staging.onrender.com |
| Dashboard | https://dashboard.render.com/web/srv-dbj1ivh42hec73bpi5q0 |
| Deployment | `dep-dbj1j0142hec73bpi6k0` — live |
| Runtime commit | `ebb2c24c1e6764eca93c9d7a89f9eb9a9427beca` |
| Source | `feat/noogle-connect-plugin-gate1`, PR #1281 |
| Region / compute | Oregon / free, read back after creation |
| Automatic deployment | Off, read back after creation |
| Runtime | Node 24.22.1 |
| Identity/database secrets | None supplied by this gate |

The build explicitly checks out the tested runtime commit, installs the isolated
locked package and runs the 70-test suite before starting. Subsequent documentation
commits are not deployed automatically. Render uses its default TCP health probe;
the HTTP checks below were performed independently over HTTPS.

## Live HTTPS checks

| Request | Observed result |
| --- | --- |
| `GET /healthz` | 200, `mode: locked-staging`, identity/device-read adapters false |
| `GET /readyz` | 503, live identity and database certification pending |
| `POST /mcp` with an invalid test bearer | 503, `mcp_locked` |
| `GET /.well-known/oauth-protected-resource` | 503, identity provider unverified |
| `GET /healthz` with an untrusted Origin | 403, `origin_denied` |

No real user token was used. Enrollment, terminal execution and public plugin
publication flags all returned false. A successful liveness response does not
mean a user can install the plugin or connect a device.

## Build and CI evidence

- Local: **70 tests passed, 0 failed, 0 skipped**, Node v24.22.1.
- Render build logs: **70 passed, 0 failed**, build successful; deployment
  subsequently reached `live` at the recorded runtime commit.
- [Noogle Connect MCP workflow](https://github.com/Shemsizedek/neo-system/actions/runs/41220629913): success.
- [General CI](https://github.com/Shemsizedek/neo-system/actions/runs/41220629850): success.
- [Miner CI](https://github.com/Shemsizedek/neo-system/actions/runs/41220629916): success.
- [Control-plane workflow](https://github.com/Shemsizedek/neo-system/actions/runs/41220629982): success.
- Runtime dependency audit at execution: 0 reported vulnerabilities across all
  severities. This is a point-in-time dependency check, not a security certification.
- Local and published Git source trees matched before service creation.

## Next gate and operational limits

1. Establish the actual approved OAuth provider: issuer discovery, client
   registration, authorization-code + S256 PKCE, refresh, audience-bound tokens,
   key rotation and a definitive revocation source. None is inferred from a URL
   or an offline verifier contract.
2. Validate a dedicated durable device store and least-privilege connection,
   migrations, two-account isolation, audit, backup and failure recovery.
3. Wire verified dependencies into startup explicitly; keep real enrollment
   and control absent. Certify ChatGPT and Codex linking, denied scope, logout,
   revocation and disconnect with two pilot accounts.
4. Start phone/Chromebook browser-companion pairing only after these checks.

This is a free staging compute plan. No paid service, database or paid fallback
was selected. Free staging is not a production availability guarantee. DNS,
WordPress and existing services were not modified; source PR remains a draft.

Keep the staging entry point locked to stop access. Before a future runtime
deployment, update the explicitly pinned source SHA to the newly tested commit
and verify the resulting deploy and live behavior. Source rollback alone does
not change the running service while auto-deploy is off.
