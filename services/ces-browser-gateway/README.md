# NEO-CES Browser Gateway v6

Standalone Cloudflare Worker runtime for the NEO-CES remote browser driver.

## What this service does

- exposes `POST /v1/ces/browser`;
- validates a server-side bearer token;
- creates one Durable Object per CES browser session;
- launches Cloudflare Browser Run through `@cloudflare/puppeteer`;
- preserves cookies and page state across driver calls;
- restricts navigation to configured HTTPS CES origins;
- supports only the read-oriented driver operations `open`, `fill`, `click`, `waitFor`, `currentUrl`, `text`, `texts`, `exists`, and `close`;
- expires idle browser sessions automatically.

It does not implement CES transaction creation, member creation, arbitrary JavaScript execution, file download, screenshot capture, or unrestricted navigation.

## Required configuration

Set the gateway bearer secret with Wrangler rather than committing it:

```bash
npx wrangler secret put CES_BROWSER_GATEWAY_TOKEN
```

`wrangler.jsonc` defaults `CES_BROWSER_ALLOWED_ORIGINS` to `https://www.community-exchange.org`. Keep this allowlist as narrow as possible.

## Local validation

Cloudflare Browser Run requires a real remote browser binding for meaningful browser testing. The service is configured with `remote: true`, so use:

```bash
npm install
npm run typecheck
npm run dev
```

## Deployment

```bash
npm run deploy
```

After deployment, configure the main NEO runtime with:

- `CES_BROWSER_GATEWAY_URL=https://<worker-host>`
- `CES_BROWSER_GATEWAY_TOKEN=<same-secret>`
- `CES_BROWSER_ALLOWED_ORIGINS=https://www.community-exchange.org`

Then run the NMNI pilot in `DRY_RUN` before any `AUTHORIZED_READ` execution.

## Session lifecycle

The client creates a random session ID on its first driver command. The Worker routes that ID to a Durable Object instance. That object owns the Puppeteer browser/page, preserving authenticated state until `close` or the idle alarm expires. The default idle TTL is 300 seconds and is clamped to 30–900 seconds.
