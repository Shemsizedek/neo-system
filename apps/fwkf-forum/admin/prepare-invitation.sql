-- FWKF Forum 025: administrative INVITATION PREPARATION ONLY.
-- Use only in isolated Neon testing branch after a human-controlled Auth account
-- has completed independent email verification. Never execute from public API.
-- Positional parameters: $1 = exact verified Neon Auth user UUID as text,
-- $2 = approved display name. No production environment is authorized.
INSERT INTO fwkf_forum.members (auth_subject, display_name, role, status)
SELECT u.id::text, $2::text, 'member', 'pending'
FROM neon_auth."user" AS u
WHERE u.id::text = $1::text
  AND u."emailVerified" IS TRUE
  AND u."banned" IS DISTINCT FROM TRUE
  AND length($2::text) BETWEEN 2 AND 80
ON CONFLICT (auth_subject) DO NOTHING
RETURNING id, auth_subject, role, status;
