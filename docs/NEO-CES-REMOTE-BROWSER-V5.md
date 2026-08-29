# NEO-CES Remote Browser Driver v5

This gate adds a production browser-driver transport for the NMNI coordinator pilot without coupling the main application to Playwright, Puppeteer, or a specific cloud browser vendor.

## Runtime model

The NEO app talks to an HTTPS browser gateway through `RemoteCesBrowserDriver`. The gateway owns the actual browser runtime and persistent page/session state. This allows Cloudflare Browser Rendering, Browserless, a Playwright service, or another approved runtime to sit behind the same driver contract.

Required environment variables:

- `CES_BROWSER_GATEWAY_URL`
- `CES_BROWSER_GATEWAY_TOKEN`
- `CES_BROWSER_ALLOWED_ORIGINS`
- optional `CES_BROWSER_REQUEST_TIMEOUT_MS`

For the NMNI legacy pilot, `CES_BROWSER_ALLOWED_ORIGINS` should normally contain only `https://www.community-exchange.org` unless another verified CES origin is required.

## Gateway contract

The driver sends authenticated `POST` requests to `/v1/ces/browser` with:

```json
{
  "sessionId": "optional-existing-session-id",
  "operation": { "op": "open", "url": "https://www.community-exchange.org/..." }
}
```

Supported operations are `open`, `fill`, `click`, `waitFor`, `currentUrl`, `text`, `texts`, `exists`, and `close`.

The gateway responds with:

```json
{
  "ok": true,
  "sessionId": "browser-session-id",
  "value": null
}
```

The first non-close operation must return a session ID. The same session ID must preserve cookies and authenticated state across subsequent operations.

## Security boundary

- gateway transport must use HTTPS;
- gateway authentication uses a server-side bearer token;
- navigation is restricted to configured origins;
- remote commands are limited to the existing `CesBrowserDriver` read-oriented surface;
- credentials remain server-side and are never committed;
- no transaction/member-write operation exists in this driver contract;
- gateway responses are type-checked before use;
- browser sessions are explicitly closed and close is idempotent.

The next production step is to implement `/v1/ces/browser` in the selected browser runtime, then run `DRY_RUN` before enabling the NMNI `AUTHORIZED_READ` pilot.
