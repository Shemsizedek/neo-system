"""Explicit deny-until-configured NEO Pass verifier interface."""
class AuthenticationUnavailable(PermissionError):
    pass

class NEOIdentityVerifier:
    def __init__(self, *, issuer=None, audience=None, jwks_uri=None):
        self.issuer=issuer
        self.audience=audience
        self.jwks_uri=jwks_uri

    def verify(self, credential):
        # Fail closed until independently implemented & audited JWT verification,
        # issuer/audience pinning, key rotation, expiry and revocation policy.
        raise AuthenticationUnavailable("NEO Pass verification not configured")
