"""NES-020 server-only claim and customer-site authorization contracts.

This module does not validate token signatures. Call only after an independently
reviewed NEO Pass verifier has authenticated a token against configured keys.
"""
from dataclasses import dataclass
from datetime import datetime, timezone

class IdentityRejected(PermissionError):
    pass

@dataclass(frozen=True)
class VerifiedSession:
    subject: str
    issuer: str
    audience: str
    expires_at: datetime
    token_use: str

def require_session(session, *, issuer, audience, now=None):
    now=now or datetime.now(timezone.utc)
    if (not isinstance(session, VerifiedSession)
        or not isinstance(session.subject,str) or not session.subject.strip()
        or session.issuer != issuer or session.audience != audience
        or session.token_use != "energy-customer"
        or not isinstance(session.expires_at,datetime)
        or session.expires_at.tzinfo is None or session.expires_at.utcoffset() is None
        or session.expires_at <= now):
        raise IdentityRejected("verified energy session required")
    return session.subject

def authorize_site(*, session, issuer, audience, tenant_id, site_id,
                   grants_provider, now=None):
    subject=require_session(session,issuer=issuer,audience=audience,now=now)
    if not all(isinstance(v,str) and v.strip() for v in (tenant_id,site_id)):
        raise IdentityRejected("invalid site scope")
    # grants_provider MUST obtain independent server-side data using a
    # parameterized query, including revocation and site ownership checks.
    allowed=grants_provider(subject,tenant_id,site_id,"energy.simulation.read")
    if allowed is not True:
        raise IdentityRejected("site access denied")
    return subject
