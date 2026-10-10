import unittest
from datetime import datetime, timedelta, timezone
from tenant_access import VerifiedPrincipal, TenantAccess
NOW=datetime(2026,10,8,tzinfo=timezone.utc)

class TenantAccessTests(unittest.TestCase):
    def setUp(self):
        self.grants={("sub1","tenant1","site1","energy.simulation.read")}
        self.access=TenantAccess(trusted_issuer="neo-pass",expected_audience="neo-energy",
            lookup=lambda sub,tenant,site,perm:(sub,tenant,site,perm) in self.grants)
    def principal(self,**changes):
        args=dict(subject="sub1",issuer="neo-pass",audience="neo-energy",
                  expires_at=NOW+timedelta(hours=1))
        args.update(changes)
        return VerifiedPrincipal(**args)
    def test_authorized(self):
        self.assertTrue(self.access.check(self.principal(),tenant_id="tenant1",
          site_id="site1",permission="energy.simulation.read",now=NOW))
    def test_cross_tenant_denied(self):
        self.assertFalse(self.access.check(self.principal(),tenant_id="tenant2",
          site_id="site1",permission="energy.simulation.read",now=NOW))
    def test_expired_denied(self):
        self.assertFalse(self.access.check(self.principal(expires_at=NOW-timedelta(seconds=1)),
          tenant_id="tenant1",site_id="site1",permission="energy.simulation.read",now=NOW))
    def test_audience_denied(self):
        self.assertFalse(self.access.check(self.principal(audience="neo-pay"),
          tenant_id="tenant1",site_id="site1",permission="energy.simulation.read",now=NOW))
    def test_untrusted_dict_denied(self):
        self.assertFalse(self.access.check({"subject":"sub1"},tenant_id="tenant1",
          site_id="site1",permission="energy.simulation.read",now=NOW))
    def test_write_denied(self):
        self.assertFalse(self.access.check(self.principal(),tenant_id="tenant1",
          site_id="site1",permission="grid.switch",now=NOW))

if __name__=="__main__":unittest.main()
