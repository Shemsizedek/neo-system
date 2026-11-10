# Publication and security policy

This GitBook directory is an **allowlisted public documentation collection**. Nothing is automatically promoted from other repository paths into this collection.

## Public content allowed

- High-level architecture and already-public technical overviews
- Non-sensitive setup instructions and API descriptions that do not expose privileged endpoints
- Clearly identified prototype status and verifiable citations to source files
- Approved public educational and institutional information

## Do not import into this collection

- Secrets, keys, passphrases, tokens, OAuth credentials, private network topology or privileged instructions
- Identity documents, KYC/AML records, bank statements, nonpublic tax/estate/trust/client records
- Private legal matters, case evidence, confidential investigative leads, or sensitive internal policy
- Unreviewed screenshots, logs, investor/customer lists, contract drafts, or personally identifiable information
- Any existing `docs/`, `personal/`, `audit/`, `data/` or operational directory **in bulk**

## Verification and release gates

Before adding public material:
1. Confirm content ownership, copyright permissions and privacy status.
2. Run secret/PII review, check external links and scan for internal endpoints.
3. Check technical claims against source and tests; label planned versus working.
4. Require a human reviewer for legal, financial, safety, security and institutional claims.
5. Record approval in the pull request; merge only approved changes.

## Sync boundary

Configure GitBook's monorepo/folder selection to **`docs/gitbook-public/` only**. Do not select the repository root or the parent `docs/` folder. Use **GitHub → GitBook** for initial import, then review GitBook's two-way sync permissions before enabling edits. Never grant blanket access to all repositories if single-repository GitHub App authorization is available.

The repository is already public. This policy reduces *additional dissemination* through a separate docs site; it does not make other publicly committed material private.
