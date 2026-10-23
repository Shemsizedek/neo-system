import unittest
from neo_kether.capability_confinement import *

def grant(gid="g1",uses=2):
    return CapabilityGrant(gid,"subject","write",("targetA","targetB"),"params",100,200,uses,"policy","revoke-root")

class C(unittest.TestCase):
    def setUp(self):
        self.k=CapabilityConfinementKernel(); self.k.register_grant(grant())
    def test_valid_use(self):
        self.assertEqual(self.k.authorize_use("g1","a1","subject","write","targetA","params",150).use_index,1)
    def test_subject_violation(self):
        with self.assertRaises(CapabilityError): self.k.authorize_use("g1","a1","other","write","targetA","params",150)
    def test_capability_violation(self):
        with self.assertRaises(CapabilityError): self.k.authorize_use("g1","a1","subject","delete","targetA","params",150)
    def test_target_violation(self):
        with self.assertRaises(CapabilityError): self.k.authorize_use("g1","a1","subject","write","targetX","params",150)
    def test_parameter_violation(self):
        with self.assertRaises(CapabilityError): self.k.authorize_use("g1","a1","subject","write","targetA","bad",150)
    def test_not_yet_valid(self):
        with self.assertRaises(CapabilityError): self.k.authorize_use("g1","a1","subject","write","targetA","params",99)
    def test_expired(self):
        with self.assertRaises(CapabilityError): self.k.authorize_use("g1","a1","subject","write","targetA","params",201)
    def test_rate_limit(self):
        self.k.authorize_use("g1","a1","subject","write","targetA","params",150)
        self.k.authorize_use("g1","a2","subject","write","targetA","params",151)
        with self.assertRaises(CapabilityError): self.k.authorize_use("g1","a3","subject","write","targetA","params",152)
    def test_revoke(self):
        self.k.revoke("g1","reason")
        with self.assertRaises(CapabilityError): self.k.authorize_use("g1","a1","subject","write","targetA","params",150)
    def test_action_replay(self):
        self.k.authorize_use("g1","a1","subject","write","targetA","params",150)
        with self.assertRaises(CapabilityError): self.k.authorize_use("g1","a1","subject","write","targetB","params",151)
    def test_duplicate_grant(self):
        with self.assertRaises(CapabilityError): self.k.register_grant(grant())
    def test_bad_window(self):
        with self.assertRaises(CapabilityError):
            CapabilityConfinementKernel().register_grant(CapabilityGrant("x","s","c",("t",),"p",10,10,1,"pol","r"))
    def test_zero_uses(self):
        with self.assertRaises(CapabilityError):
            CapabilityConfinementKernel().register_grant(CapabilityGrant("x","s","c",("t",),"p",10,20,0,"pol","r"))
    def test_audit_root_moves(self):
        a=self.k.audit_root; self.k.authorize_use("g1","a1","subject","write","targetA","params",150); self.assertNotEqual(a,self.k.audit_root)
