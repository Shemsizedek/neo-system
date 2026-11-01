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

## Canonical education terminology

For current NEO System implementation and public education surfaces:

- **GISS** means **Global Interdependent School System**. GISS is the shared school-system/platform layer for learning services, academic records, school operations, and participating institutions.
- **GISD** means **Global Interdependent School District**. GISD is the district/institutional domain that organizes participating schools, temples, programs, authorities, and district-level education governance.
- **NEO Cipher** is the shared LMS/education control plane used by GISD/GISS learning surfaces.
- **NEO Cipher #D — 999/144 Yamassee Secure Script Protocol** is a separate security and secure-communications subsystem. It must not be treated as the LMS cryptographic boundary merely because both use the NEO Cipher brand.

The live HolyTemples education surface and current platform tests use the Interdependent naming above. Older doctrine/curriculum records that expand GISD as “Global Independent School System” are retained as historical/source provenance and must not silently override the current operational terminology. Migration of those records should preserve their original wording while adding an explicit legacy/canonical mapping when they are next revised.

## Architecture mapping

Current operational mapping:

`GISD district/domain -> GISS school-system/platform -> NEO Cipher LMS -> NEOpass-authenticated learner and faculty services`

NEO Cipher #D remains a separate defensive security component with its own key-management, cryptographic, transport, and audit requirements.
