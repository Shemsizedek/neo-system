# NEOTHERAPY-IMPL-001 acceptance tests

The executable test harness should assert:

1. NFM-001 cannot start without ACTIVE consent.
2. NFM-001 cannot start without an ACTIVE practitioner credential.
3. NFM-001 cannot start without modality authorization.
4. NFM-001 cannot start before safety screening.
5. WITHDRAWN consent prevents further modality execution.
6. Session states cannot skip the canonical sequence.
7. STOPPED is terminal.
8. COMPLETE is terminal.
9. Public credential verification never returns participant/session data.
10. D0/H1 evidence cannot be promoted automatically to V5.
11. Cross-system participant-data export is denied by default.
