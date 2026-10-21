import importlib.util
import pathlib
import unittest
p=pathlib.Path(__file__).with_name("evidence_registry.py")
spec=importlib.util.spec_from_file_location("evidence_registry",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class RegistryTests(unittest.TestCase):
    def test_append_and_checkpoint(self):
        s=m.InMemoryTestStore();r=m.EvidenceRegistry(s)
        first=r.append({"status":200},0,m.ZERO)
        self.assertEqual(r.checkpoint()["head_sha256"],first["sha256"])
    def test_stale_writer_rejected(self):
        s=m.InMemoryTestStore();r=m.EvidenceRegistry(s)
        r.append({"a":1},0,m.ZERO)
        with self.assertRaises(m.ConflictError):r.append({"a":2},0,m.ZERO)
    def test_corrective_entry_preserves_original(self):
        s=m.InMemoryTestStore();r=m.EvidenceRegistry(s)
        first=r.append({"claim":"initial"},0,m.ZERO)
        r.append({"correction_of":1,"claim":"amended"},1,first["sha256"])
        self.assertEqual(s.records[0],first)
    def test_replaced_witness_head_rejected(self):
        s=m.InMemoryTestStore();r=m.EvidenceRegistry(s)
        a=r.append({"a":1},0,m.ZERO)
        self.assertFalse(r.verify_against_witness((1,"0"*64)))
        self.assertTrue(r.verify_against_witness((1,a["sha256"])))
    def test_concurrent_compare_append_failure(self):
        class Rejecting(m.InMemoryTestStore):
            def compare_append(self,*args):return False
        with self.assertRaises(m.ConflictError):
            m.EvidenceRegistry(Rejecting()).append({"a":1},0,m.ZERO)
