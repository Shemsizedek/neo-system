# NEO-CES Live Coordinator Browser v3

This layer turns the v2 authenticated-worker interfaces into a deployable, read-only browser collection architecture without embedding CES credentials or enabling transaction/member writes.

## Verified public CES behavior

- Current CES login accepts account number or email plus password.
- CES recommends the mobile-friendly site for account access.
- CES members can view balances, statements and trading activity after login.
- Coordinators are trusted users who can assist members and may enter transactions on behalf of others.
- CES2 is being rebuilt on the Komunitin-derived modern stack.

## Design

`LiveLegacyCesCoordinatorBrowser` receives an injected browser driver. It does not depend on Playwright/Puppeteer directly, so Vercel, Cloudflare Browser Rendering, Playwright, or another authorized worker can implement the driver.

The browser layer:

1. opens the public login page;
2. fills account/email and password from the v2 secret provider;
3. waits for an authenticated marker;
4. collects only requested read-scoped record kinds;
5. detects session expiry;
6. retries transient collection failures;
7. always closes the driver/session through the v2 worker's `finally` path.

## Important production step

The row selectors for offers, wants, balances, activity and statements are intentionally not guessed. Capture them from an authorized coordinator session and set them through `CesLiveBrowserOptions.selectors`.

This prevents a brittle scraper and avoids accidental collection of unrelated/private member fields.