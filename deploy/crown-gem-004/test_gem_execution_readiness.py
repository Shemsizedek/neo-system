import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_execution_readiness import readiness,require_execution_gate
class ReadinessTests(unittest.TestCase):
 def test_defaults_fail_closed(self):
  result=readiness({})
  self.assertFalse(result["ready"])
  self.assertFalse(result["github_write_enabled"])
 def test_partial_verifications_fail(self):
  self.assertFalse(readiness({"GEM_APPROVAL_DB_ISOLATED":"verified"})["ready"])
 def test_untrusted_flags_cannot_grant_write(self):
  env={key:"verified" for key in ("GEM_APPROVAL_DB_ISOLATED","GEM_APPROVAL_DB_PERSISTENCE","GEM_APPROVAL_GOOGLE_SESSION","GEM_APPROVAL_ATOMIC_CONSUME","GEM_APPROVAL_CSRF_ORIGIN","GEM_APPROVAL_AUDIT","GEM_APPROVAL_CI","GEM_APPROVAL_OPERATOR_REVIEW")}
  self.assertTrue(readiness(env)["ready"])
  with self.assertRaises(PermissionError):require_execution_gate(env)
 def test_claimed_truthy_is_not_verified(self):
  self.assertFalse(readiness({"GEM_APPROVAL_DB_ISOLATED":"true"})["checks"]["isolated_database"])
if __name__=="__main__":unittest.main()
