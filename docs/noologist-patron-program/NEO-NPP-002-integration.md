# NEO-NPP-003 — Neotherapist Client Service Integration (Corrected)

## Authoritative program boundary
The **30-day Noologist Patron Program is a client-facing Neotherapy service**, not a GISD/GISS school course. Only a Neotherapist who has **completed the apprenticeship** and whose service authorization and permitted scope have been verified may deliver it. A client is **not** a Templist, student, initiate or apprenticeship candidate by virtue of buying this program.

## Separation of systems
- **School / apprenticeship:** GISD/GISS may hold practitioner training and apprenticeship evidence, but must not enroll clients into a degree program.
- **Client services:** NEO Neotherapy / NEO Lifestyle manages client intake, consent, appointment schedule, 30-day wellness sessions, optional journaling, progress review, payment disclosures and completion summary.
- **NEO Algo / Oracle:** may retrieve approved program information and practitioner guidance, subject to privacy and source boundaries.
- **NEOsync:** preserves approved versions and audit evidence; no personal client information in public GitHub.

## Client journey
1. Client receives scope, price ($288/month proposed), session frequency, cancellation/refund and privacy disclosures.
2. Practitioner eligibility gate verifies completed apprenticeship, active authorization, identity and lawful scope of service.
3. Client opts into specific spiritual practices, consents, and books a private session.
4. Neotherapist delivers 30-day program, documents only necessary service events and agreed goals in access-controlled storage.
5. At day 30, client receives a wellness progress/continuation summary, **not a Temple degree or practitioner certification**.

## Permissions
- Client: only own appointments, preferences and progress.
- Assigned Neotherapist: assigned clients only, with active verified authorization.
- Supervisor: limited quality/safeguarding oversight where authorized.
- Administrator: operations access, not unrestricted sensitive notes.

## Release tests
- Client enrollment never creates a GISD student record, Temple degree, Holy Order membership or Neotherapist credential.
- Practitioner without completed apprenticeship or active authorization cannot accept sessions.
- Consent is recorded before optional practices; withdrawal is honored.
- Client A cannot read client B's information; practitioner revocation blocks access.
- No diagnosis, disease-treatment claims, supplement prescribing or unsupervised clinical interventions.
- Billing is disabled until terms and payment integration are approved.

**State:** design/registry correction committed; runtime, identity checks, scheduling, payments and production service are NOT implemented or tested.
