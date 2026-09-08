# NEO Social Gateway

The NEO Social Gateway is the canonical runtime for social OAuth integrations.
LinkedIn OAuth is served by the Cloud Run service `neo-social-gateway`, exposed
through `gateway.holytemples.org`.

## LinkedIn OAuth

Production callback:

`https://gateway.holytemples.org/connect/linkedin/callback`

The LinkedIn authorization flow uses these environment variables only:

- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`

The configured LinkedIn scopes are `openid profile email w_member_social`.
The connect route requires an authenticated NEOpass identity. OAuth state is
bound to that identity, expires, and is consumed once. Tokens are stored
server-side and are not returned by the callback or health endpoint.

The production deployment is defined by
`.github/workflows/deploy-social-gateway-cloud-run.yml`. LinkedIn OAuth does
not require WordPress, Vercel, or Cloudflare.
