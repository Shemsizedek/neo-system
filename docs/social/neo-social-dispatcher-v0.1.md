# NEO Social Dispatcher v0.1

The NEO Social Dispatcher is the reusable routing layer between canonical campaign payloads and platform/provider execution.

## Routing

Default order:

- Facebook: Windsor organic connected provider → direct Facebook API.
- LinkedIn: Windsor organic connected provider → direct LinkedIn API.
- X: Windsor organic connected provider.
- YouTube Community: browser/UI handoff.

The connected-provider route is preferred only when the runtime reports it as available. Existing direct API adapters remain intact as fallback.

## Runtime boundary

Repository code does not embed ChatGPT connector credentials. Instead, the dispatcher accepts a runtime implementation with `isAvailable(provider, destination, job)` and `execute(provider, job)` methods. This permits ChatGPT-connected providers, server adapters, or future connector runtimes to share the same routing and receipt semantics without hard-coding secrets.

## Receipt semantics

- Provider success + platform post ID: `published`.
- Provider success without post ID: `submitted`, pending readback.
- Provider failure: dispatcher tries the next configured provider unless fail-fast mode is explicitly enabled.
- No provider succeeds: fail closed with the attempt ledger attached to the error.

This prevents accepted connector writes from being misrepresented as verified publications.

## Campaign independence

The dispatcher is not NOMNI-specific. Any NEO Social campaign that supplies destination, account, content ID, source version, and its canonical media/caption payload can use the same routing contract.

## Audit objective

Each dispatch returns the selected provider plus the attempted-provider chain. Campaign-specific receipt ledgers can persist that normalized output without reimplementing provider-selection logic.
