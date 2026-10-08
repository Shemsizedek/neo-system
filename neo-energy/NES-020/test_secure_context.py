import unittest
from datetime import datetime, timedelta, timezone
from secure_context import VerifiedSession, IdentityRejected, authorize_site
NOW=datetime(2026,10,8,tzinfo=timezone.utc)

class SecurityTests(unittest.TestCase):
    def setUp(self):
        self.grants={("member1","tenantA","homeA","energy.simulation.read")}
        self.provider=lambda sub,t,s,p:(sub,t,s,p) in self.grants
    def session(self,**updates):
        values=dict(subject="member1",issuer="neo-pass",audience="neo-energy",
                    expires_at=NOW+timedelta(minutes=15),token_use="energy-customer")
        values.update(updates)
        return VerifiedSession(**values)
    def permit(self, session, tenant_id="tenantA",site_id="homeA"):
        return authorize_site(session=session,issuer="neo-pass",audience="neo-energy",
                              tenant_id=tenant_id,site_id=site_id,
                              grants_provider=self.provider,now=NOW)
    def test_authorized(self): self.assertEqual(self.permit(self.session()),"member1")
    def test_cross_tenant(self):
        with self.assertRaises(IdentityRejected): self.permit(self.session(),tenant_id="tenantB")
    def test_cross_site(self):
        with self.assertRaises(IdentityRejected): self.permit(self.session(),site_id="homeB")
    def test_expired(self):
        with self.assertRaises(IdentityRejected):
            self.permit(self.session(expires_at=NOW-timedelta(seconds=1)))
    def test_wrong_audience_and_purpose(self):
        for updates in (dict(audience="neo-bank"),dict(token_use="crown-office")):
            with self.assertRaises(IdentityRejected):self.permit(self.session(**updates))
    def test_untrusted_claim_dict(self):
        with self.assertRaises(IdentityRejected):
            self.permit({"subject":"member1","audience":"neo-energy"})
    def test_revoked_grant(self):
        self.grants.clear()
        with self.assertRaises(IdentityRejected):self.permit(self.session())
if __name__=="__main__": unittest.main()
