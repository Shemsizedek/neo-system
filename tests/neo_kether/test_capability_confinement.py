import unittest
from neo_kether.capability_confinement import *

def grant(gid="g1", uses=2):
    return CapabilityGrant(gid,"subject","write",("targetA","targetB"),"params",100,200,uses,"policy","revoke-root")

class CapabilityTests(unittest.TestCase):
    def setUp(self):
        self.k=CapabilityConfinementKernel()
        self.k.register_grant(grant())

    def test_valid_use(self):
        self.assertEqual(self.k.authorize_use("g1","a1","subject","write","targetA","params",150).use_index,1)

    def test_scope_violations_fail_closed(self):
        cases=[
            ("other","write","targetA","params",150),
            ("subject","delete","targetA","params",150),
            ("subject","write","targetX","params",150),
            ("subject","write","targetA","bad",150),
        ]
        for i,args in enumerate(cases):
            with self.assertRaises(CapabilityError):
                self.k.authorize_use("g1",f"a{i}",*args)

    def test_time_rate_revocation_and_replay(self):
        with self.assertRaises(CapabilityError):
            self.k.authorize_use("g1","early","subject","write","targetA","params",99)
        self.k.authorize_use("g1","a1","subject","write","targetA","params",150)
        with self.assertRaises(CapabilityError):
            self.k.authorize_use("g1","a1","subject","write","targetA","params",151)
        self.k.revoke("g1","reason")
        with self.assertRaises(CapabilityError):
            self.k.authorize_use("g1","a2","subject","write","targetA","params",152)

if __name__=="__main__":
    unittest.main()
