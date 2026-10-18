# NEO-TMS-G008 private staging gate

## Verified
- GitHub CI run 39156630020 for G007 head a96f6e83e18401e8348e92f0236ea0c5eda4e547: success.

## Added
- Draft role_grants and posting_attempts tables; RLS enabled for sensitive treasury tables, with no permissive policies. Application access must remain denied until explicit, audited policies are added.

## Release blockers
1. Review the dependency chain PRs #1026, #1027, #1028, #1029, #1031, #1032, then G008; merge in order after checks.
2. Execute migration tests on disposable PostgreSQL and verify default-deny RLS, FORCE RLS, schema privileges and tenant isolation.
3. Implement authenticated OIDC identity to DB session binding, with no user-controllable tenant identifiers.
4. Implement atomic posting with advisory/account locks, multi-currency balance checks, fund-purpose restrictions, sufficient available balances, dual approvals, and append-only audit; remove fail-closed exception only after tests.
5. Run concurrent double-spend, replay, permission escalation, rejected approval, trust restriction and recovery tests.
6. Add private network/identity-gateway controls, encryption, backups, monitoring and mobile acceptance tests.
7. Do not treat demo balances as actual assets; no live transfers, assessments or securities activity.

No deployment, migration execution, or production posting is claimed.
