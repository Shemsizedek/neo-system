import importlib.util
import pathlib
import unittest
p=pathlib.Path(__file__).with_name("audit_chain.py")
spec=importlib.util.spec_from_file_location("audit_chain",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ChainTests(unittest.TestCase):
    def sample(self):
        one=m.chain_event(1,m.ZERO,{"status":200})
        two=m.chain_event(2,one["sha256"],{"status":429})
        return [one,two]
    def test_valid_chain(self):
        self.assertTrue(m.verify(self.sample()))
    def test_tampered_event(self):
        r=self.sample();r[0]["event"]["status"]=401
        self.assertFalse(m.verify(r))
    def test_deleted_event(self):
        self.assertFalse(m.verify(self.sample()[1:]))
    def test_reordered_events(self):
        self.assertFalse(m.verify(list(reversed(self.sample()))))
    def test_deterministic_digest(self):
        self.assertEqual(m.chain_event(1,m.ZERO,{"a":1,"b":2})["sha256"],m.chain_event(1,m.ZERO,{"b":2,"a":1})["sha256"])
