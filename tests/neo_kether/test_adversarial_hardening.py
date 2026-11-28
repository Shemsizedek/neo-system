import unittest
from neo_kether.adversarial_hardening import *
P={'mode':'safe'};PH=AdversarialHardeningKernel.parameter_hash(P)
class H(unittest.TestCase):
 def test_payload_and_revocation(self):
  k=AdversarialHardeningKernel();k.register(HardenedGrant('r','a','write',('A',),PH,2,1,'rr'))
  self.assertTrue(k.authorize('r',P,'A'))
  with self.assertRaises(HardeningError):k.authorize('r',{'mode':'unsafe'},'A')
  with self.assertRaises(HardeningError):k.revoke('r','x','bad')
