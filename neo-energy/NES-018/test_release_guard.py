import unittest
from release_guard import readiness, REQUIRED, PHYSICAL

class ReleaseTests(unittest.TestCase):
    def test_empty_evidence_blocks(self):
        r=readiness({})
        self.assertFalse(r["ready"])
        self.assertIn("identity",r["missing"])
    def test_full_preview_evidence(self):
        evidence={k:True for keys in REQUIRED.values() for k in keys}
        r=readiness(evidence)
        self.assertTrue(r["ready"])
        self.assertFalse(r["deployment_executed"])
        self.assertFalse(r["field_control_enabled"])
    def test_physical_mode_requires_extra_signoff(self):
        evidence={k:True for keys in REQUIRED.values() for k in keys}
        r=readiness(evidence,request_field_control=True)
        self.assertFalse(r["ready"])
        self.assertIn("utility_permission",r["missing"]["physical_control"])
    def test_missing_or_false_evidence_blocks(self):
        evidence={k:True for keys in REQUIRED.values() for k in keys}
        evidence["tenant_isolation_tests"]=False
        self.assertFalse(readiness(evidence)["ready"])
    def test_invalid_evidence_rejected(self):
        with self.assertRaises(ValueError):readiness(None)

if __name__=="__main__":unittest.main()
