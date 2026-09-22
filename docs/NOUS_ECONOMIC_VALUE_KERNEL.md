# NEO Nous Economic & Value Kernel

The Economic & Value Kernel gives NEO Nous OS a typed, provenance-aware accounting boundary for internal and external value records.

## Flow

CONTRIBUTION → VALUE EVENT → UNIT OF ACCOUNT → CREDIT → LEDGER → EXCHANGE → TREASURY → DISTRIBUTION → RESERVE → RECONCILIATION → AUDIT

## Value classes

The kernel keeps modeled NOMNI, internal mutual credit, documented assets/liabilities, claimed receivables, agreed obligations, adjudicated obligations, external settlements, revenue, expenses, and reserves as distinct classes.

A consensus decision or internal ledger entry does not by itself establish ownership of an external asset or create a legally enforceable obligation against a nonparticipant.

## World Credit Clock

`worldCreditClockValueEvent()` can project a World Credit Clock snapshot into the economic ledger as `NOMNI_MODELED_CREDIT / MODELED`. It intentionally does not convert NOMNI into fiat currency, market value, an external receivable, or adjudicated debt.

## Core operations

- `validateNousValueEvent()` enforces unit, account, class, and provenance constraints.
- `postNousValueEvent()` performs immutable event posting and duplicate-event protection.
- `reconcileNousLedger()` deterministically derives account balances through an `asOf` timestamp.
- `createNousEconomicSnapshot()` combines treasury reconciliation with an optional synchronized World Credit Clock snapshot.

## Go-live boundary

This module is production architecture for NEO's internal economic domain. External custody, banking, securities, payment, tax, title, or legally enforceable obligations require their own documented authority and integration paths; this kernel does not manufacture those states from internal accounting.
