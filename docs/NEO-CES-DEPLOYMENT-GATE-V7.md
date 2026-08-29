# NEO-CES Deployment Gate v7

This gate takes the merged browser gateway from deployable source to a controlled production deployment. It deliberately separates infrastructure deployment from CES authentication.

## 1. Cloudflare prerequisites

The Cloudflare account must support Workers, Durable Objects, and Browser Run. The Worker configuration already declares:

- browser binding: `BROWSER`;
- Durable Object namespace: `CES_BROWSER_SESSIONS`;
- Durable Object migration: `CesBrowserSession`;
- allowed CES origin: `https://www.community-exchange.org`.

## 2. Install and validate

From `services/ces-browser-gateway`:

```bash
npm install
npm run typecheck
```

## 3. Create the gateway secret

Generate a high-entropy bearer token outside source control, then store it through Wrangler:

```bash
npx wrangler secret put CES_BROWSER_GATEWAY_TOKEN
```

Never place this value in Git, browser-side Vite variables, screenshots, logs, or CES records.

## 4. Deploy

```bash
npm run deploy
```

Record the HTTPS Worker origin returned by Wrangler. Do not add untrusted origins to `CES_BROWSER_ALLOWED_ORIGINS`.

## 5. Gateway smoke test

Set the deployed gateway URL and the same bearer token in the operator shell only:

```bash
export CES_BROWSER_GATEWAY_URL="https://<worker-host>"
export CES_BROWSER_GATEWAY_TOKEN="<secret>"
npm run smoke
```

The smoke test opens only the public CES login page, verifies that the active page remains on the approved HTTPS CES origin, and closes the browser session. It does not submit CES credentials.

## 6. Connect the NEO runtime

Configure the server-side NEO runtime with:

```text
CES_BROWSER_GATEWAY_URL=https://<worker-host>
CES_BROWSER_GATEWAY_TOKEN=<same-secret>
CES_BROWSER_ALLOWED_ORIGINS=https://www.community-exchange.org
```

These values must remain server-side. The gateway token must never be exposed through a `VITE_` environment variable.

## 7. First NMNI run

Run the NMNI pilot in `DRY_RUN` first. A successful dry run proves orchestration and configuration without authenticating to CES.

Only after the deployment smoke test and dry run succeed should verified CES selectors and NMNI credentials be provisioned for `AUTHORIZED_READ`.

## Exit criteria

The deployment gate is complete when all of the following are true:

1. gateway typecheck passes;
2. Worker deploys with Browser Run and Durable Object bindings;
3. `CES_BROWSER_GATEWAY_TOKEN` exists only as a secret;
4. public-login smoke test passes;
5. NEO runtime points to the deployed HTTPS gateway;
6. NMNI `DRY_RUN` completes;
7. no CES credentials have been committed or exposed client-side.
