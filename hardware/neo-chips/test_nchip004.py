"""NCHIP-004 negative/positive simulated device tests."""
import copy
import unittest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from nchip002_simulator import digest_event
from nchip004_hal import NousHAL, ReplayError

class NousHALTests(unittest.TestCase):
    def setUp(self):
        self.key = Ed25519PrivateKey.generate()
        self.hal = NousHAL("NEO-DEV-001")
        self.record = self.hal.submit({"kind":"sensor","value":42}, self.key)

    def test_deterministic_digest(self):
        self.assertEqual(digest_event({"value":42,"kind":"sensor"}),digest_event({"kind":"sensor","value":42}))

    def test_valid_and_replay(self):
        self.assertTrue(self.hal.accept(self.record,self.key.public_key())["accepted"])
        with self.assertRaises(ReplayError):
            self.hal.accept(self.record,self.key.public_key())

    def test_bad_signature(self):
        wrong = Ed25519PrivateKey.generate()
        with self.assertRaises(ValueError):
            self.hal.accept(self.record,wrong.public_key())

    def test_tampered_payload(self):
        altered=copy.deepcopy(self.record)
        altered["payload"]["sequence"]=23
        with self.assertRaises(ValueError):
            self.hal.accept(altered,self.key.public_key())

    def test_cross_device(self):
        other=NousHAL("NEO-OTHER")
        with self.assertRaises(ValueError):
            other.accept(self.record,self.key.public_key())

    def test_sequence_progression(self):
        r2=self.hal.submit({"kind":"sensor","value":43},self.key)
        self.assertEqual(self.hal.accept(self.record,self.key.public_key())["sequence"],1)
        self.assertEqual(self.hal.accept(r2,self.key.public_key())["sequence"],2)

    def test_reject_nonobject_event(self):
        with self.assertRaises(ValueError):
            self.hal.submit(["not","object"],self.key)

if __name__=="__main__":
    unittest.main()
