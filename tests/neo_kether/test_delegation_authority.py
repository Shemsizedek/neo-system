import unittest
from neo_kether.delegation_authority import *

def root():
    return DelegableGrant("root","alice","write",("A","B"),"params",100,500,10,3,888,None,"policy")

def child(i="c1",subject="bob",targets=("A",),uses=5,nb=120,exp=400,depth=2,level=888,cap="write",ph="params",policy="policy",parent="root"):
    return DelegableGrant(i,subject,cap,targets,ph,nb,exp,uses,depth,level,parent,policy)

class DelegationTests(unittest.TestCase):
    def setUp(self):
        self.k=DelegationOfAuthorityKernel()
        self.k.register_root(root())

    def test_non_escalation(self):
        self.assertEqual(self.k.delegate("root",child(),"alice").depth,1)
        cases=[
            child(i="t",targets=("A","C")),
            child(i="c",cap="delete"),
            child(i="p",ph="other"),
            child(i="u",uses=11),
            child(i="l",level=999),
            child(i="d",depth=3),
        ]
        for grant in cases:
            with self.assertRaises(DelegationError):
                self.k.delegate("root",grant,"alice")

    def test_recursive_revocation(self):
        self.k.delegate("root",child(),"alice")
        grandchild=child("c2","carol",("A",),3,130,350,1,888,parent="c1")
        self.k.delegate("c1",grandchild,"bob")
        self.assertEqual(set(self.k.revoke("c1","reason")),{"c1","c2"})
        self.assertFalse(self.k.is_active("c2",200))

    def test_delegator_and_parent_binding(self):
        with self.assertRaises(DelegationError):
            self.k.delegate("root",child(),"mallory")
        with self.assertRaises(DelegationError):
            self.k.delegate("root",child(i="x",parent="other"),"alice")

if __name__=="__main__":
    unittest.main()
