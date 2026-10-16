# CSC-GISS-004: NEO Cipher Admin Dashboard

Status: proposed architecture; not a deployed dashboard.

The platform-wide administrative interface is named NEO Cipher Admin Dashboard. Temple Officer Dashboard is the institutional workspace designation for participating temples. The same underlying institution-scoped dashboard framework must serve Moorish Science Temple branches, churches, temple schools, and other eligible GISD institutions, including institutions outside the Holy Alliance.

Each institution has a separate institutional ID, governance charter, officer-role vocabulary, enrollment policies, training assignments, reporting scope, and authorized administrators. Joining GISD does not confer World Temple No. 24 authority over other institutions.

Proposed role classes: GISD platform operator (platform maintenance only), institution administrator (own institution), temple officer (only roles explicitly delegated by own institution), instructor (assigned classes), student (own records), and auditor (limited read-only scope). Authentication alone never grants office. Keep GISS course progress distinct from appointment records.

Official 101 courses remain within the existing NEO Cipher school portal, including Temple Governance 101 and Ministry 101. Do not create separate NEO Pass classes. Existing GISS read-only authorization cannot be used for officer-role mutation.

Implementation acceptance criteria:
1. An authenticated administrator can access only their own institution.
2. A Moorish Science Temple branch can configure its Temple Officer Dashboard without reading another branch's records.
3. Churches and non-Holy Alliance schools can configure their own officer labels and governance without inheriting Temple No. 24 jurisdiction.
4. Student course completion cannot create or modify officer appointments.
5. Changes to appointments require institution-specific delegated authority, approval evidence, and audit records.
6. Platform operators cannot silently override institution governance.
7. Admin, instructor and student interfaces meet mobile and accessibility requirements.
8. Governance approvals remain Draft -> Review -> Approve -> Sign -> Publish -> Archive; no autonomous signing or ratification.

Repository integration candidates: server/neo-platform-api/temple-giss-runtime.mjs; server/neo-platform-api/GISS-AUTHORIZATION.md; server/neo-router/institutional-governance.mjs. This file changes no runtime permissions.
