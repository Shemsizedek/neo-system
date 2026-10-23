import unittest
from authorization import can_access
class AuthTests(unittest.TestCase):
    def test_default_deny(self):
        self.assertFalse(can_access(role="CUSTOMER_READ",action="site.read",requested_site="s1",granted_sites=["s1"]))
    def test_scoped_access(self):
        self.assertTrue(can_access(role="CUSTOMER_READ",action="site.read",requested_site="s1",granted_sites=["s1"],verified_identity=True))
        self.assertFalse(can_access(role="CUSTOMER_READ",action="site.read",requested_site="s2",granted_sites=["s1"],verified_identity=True))
    def test_never_field_control(self):
        self.assertFalse(can_access(role="FIELD_OPERATOR",action="switch.close",requested_site="s1",granted_sites=["s1"],verified_identity=True))
if __name__=="__main__": unittest.main()
