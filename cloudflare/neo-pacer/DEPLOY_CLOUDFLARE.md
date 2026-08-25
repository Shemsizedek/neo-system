# Deploy NEO-PACER to Cloudflare

1. `npm install`
2. `npx wrangler d1 create neo-pacer`
3. Put the returned database ID in `wrangler.jsonc`.
4. Import:
   `npx wrangler d1 execute neo-pacer --remote --file=./migrations/0001_neo_pacer.sql`
5. Generate types:
   `npm run types`
6. Validate:
   `npm run check`
7. Deploy:
   `npm run deploy`

Result:
- `https://<worker>.workers.dev/health`
- `https://<worker>.workers.dev/mcp`

Because Cloudflare is connected to GitHub, push this project to the connected repository and Cloudflare can redeploy on every push.
