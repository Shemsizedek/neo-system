# NEO Sovereign Hosting Candidate

Gate 111 establishes a provider-neutral, self-host-capable runtime target. This directory is a **candidate/shadow environment**, not authorization to move production traffic.

## Required before production cutover

1. Verify host hardening, patching, firewall, intrusion monitoring and restricted administration.
2. Verify application health and functional tests against the same contracts used by the current provider.
3. Prove backup and restore for every stateful dependency, including off-host recovery copies.
4. Validate capacity under load and define reserve headroom.
5. Validate TLS termination and certificate renewal.
6. Validate provider-independent monitoring and alerting.
7. Test rollback to the current provider.
8. Approve the capital/operating-cost gate.
9. Separately approve DNS, database-primary, identity-authority and secret migrations.

A healthy self-host candidate does not imply a safe production cutover.
