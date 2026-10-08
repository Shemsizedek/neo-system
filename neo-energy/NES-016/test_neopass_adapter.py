import unittest
from neopass_adapter import NEOIdentityVerifier, AuthenticationUnavailable
class IdentityTests(unittest.TestCase):
    def test_empty_credential_denied(self):
        with self.assertRaises(AuthenticationUnavailable):
            NEOIdentityVerifier().verify(None)
    def test_forged_claims_denied(self):
        with self.assertRaises(AuthenticationUnavailable):
            NEOIdentityVerifier(issuer="sample",audience="energy").verify({"role":"admin","site_id":"all"})
if __name__=="__main__":unittest.main()
