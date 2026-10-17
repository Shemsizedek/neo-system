import unittest
from neo_kether.distributed_transaction import *
def parts(tx="tx"):return (Participant("p1",tx,"c1"),Participant("p2",tx,"c2"))
class D(unittest.TestCase):
 def setUp(self):self.k=DistributedTransactionKernel();self.k.begin("tx",parts(),1)
 def test_begin(self):self.assertEqual(self.k.states["tx"],GlobalState.PREPARING)
 def test_identity_mismatch(self):
  with self.assertRaises(DistributedTxError):DistributedTransactionKernel().begin("x",parts("wrong"),1)
 def test_prepare_all(self):
  self.k.prepare("tx","p1",1,True,"a");self.k.prepare("tx","p2",1,True,"b");self.assertEqual(self.k.states["tx"],GlobalState.PREPARED)
 def test_commit(self):
  self.k.prepare("tx","p1",1,True,"a");self.k.prepare("tx","p2",1,True,"b");self.k.decide("tx",1,"COMMIT");self.assertEqual(self.k.states["tx"],GlobalState.COMMITTED)
 def test_timeout_in_doubt(self):self.assertTrue(self.k.coordinator_timeout("tx",1));self.assertEqual(self.k.states["tx"],GlobalState.IN_DOUBT)
 def test_observe_same_decision(self):
  self.k.prepare("tx","p1",1,True,"a");self.k.prepare("tx","p2",1,True,"b");d=self.k.decide("tx",1,"COMMIT");self.k.observe("tx","p1",d.decision_hash);self.k.observe("tx","p2",d.decision_hash);self.assertTrue(self.k.globally_observed("tx"))
