# NEO Education Identity Standard

The canonical NEO founder principal `neo:founder:000001` is reserved as Account #1 for NEO Cipher, GISD, NEO University, and the NEO Classroom Bridge.

Founder ownership identifies the first reserved NEO principal. It does not confer student-record access, grading authority, faculty status, registrar authority, credential issuance authority, district administration, or external classroom-provider privileges.

## Student records
Student and learner records are privacy-sensitive. Read and write access must be scoped to an authenticated educational role and the relevant institution/course context. Founder status alone is insufficient.

## Grading and credentials
Grades, academic standing, completion records, certificates, degrees, and other credentials require an authorized faculty, registrar, or credential-issuer context. High-impact issuance and record mutation require step-up controls and audit history.

## External classroom providers
Google Classroom or another external LMS retains its own native accounts, roles, permissions, API policies, and authorization model. NEO may map a verified external identity to the canonical founder subject, but must not override provider-native roles or treat Account #1 as provider administrator authority.

OAuth tokens, passwords, service-account credentials, recovery material, and other secrets are prohibited from the public identity registry.

## Separation of systems
NEO Cipher may provide the shared LMS/education control plane while GISD and NEO University remain institution-specific domains. External classroom bridges synchronize only data and actions for which the authenticated external account has granted scope.
