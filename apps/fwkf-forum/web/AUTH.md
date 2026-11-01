# Forum Managed Auth integration boundary

Managed Better Auth was provisioned **only** on Neon branch `fwkf-forum-g020-staging` (`br-misty-sun-b850yi7t`), with the existing project `neo-twlf-forum` and unchanged `main` branch.

The front-end adapter `auth-sdk.mjs` uses the official `@neondatabase/auth` package. At build time, configure the **branch-specific** `VITE_NEON_AUTH_URL` and add only the chosen isolated test-host origin to that branch's trusted origins. The adapter does **not** expose sign-up, and it does not trust the user's JWT role claims. Protected Forum server routes must validate Neon Auth's EdDSA bearer JWT through the configured JWKS and enforce the server-side member-role table.

Tests so far cover crypto signatures, API authorization, forum workflows, transaction rollback and read-only prelaunch UI. **Not verified:** an actual Neon-managed user signing in, session refresh, email verification, or browser-to-Postgres write flow. No public registration, posting or user data is authorized.

Staging branch expiry: **2026-11-15 23:00 UTC**. Extend it only deliberately after confirming the free-plan quota. No credentials committed.
