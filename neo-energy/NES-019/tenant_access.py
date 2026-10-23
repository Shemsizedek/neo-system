"""NEO Energy authorization: accepts only trusted server-created identity objects."""
from dataclasses import dataclass
from datetime import datetime, timezone

@dataclass(frozen=True)
class VerifiedPrincipal:
    subject: str
    issuer: str
    audience: str
    expires_at: datetime

    def valid(self, *, trusted_issuer, expected_audience, now=None):
        now=now or datetime.now(timezone.utc)
        return (bool(self.subject) and self.issuer==trusted_issuer
                and self.audience==expected_audience and self.expires_at.tzinfo is not None
                and self.expires_at>now)

class TenantAccess:
    def __init__(self, *, trusted_issuer, expected_audience, lookup):
        self.issuer=trusted_issuer
        self.audience=expected_audience
        self.lookup=lookup

    def check(self, principal, *, tenant_id, site_id, permission, now=None):
        if not isinstance(principal,VerifiedPrincipal):
            return False
        if not principal.valid(trusted_issuer=self.issuer,
                               expected_audience=self.audience,now=now):
            return False
        if not all(isinstance(x,str) and x.strip() for x in (tenant_id,site_id,permission)):
            return False
        # lookup must execute parameterized query, check non-revoked grants and tenant ownership.
        return self.lookup(principal.subject,tenant_id,site_id,permission) is True
