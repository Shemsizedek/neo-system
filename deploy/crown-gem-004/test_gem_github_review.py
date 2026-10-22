import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_development_proposals import propose
from gem_github_review import prepare_patch
class ReviewTests(unittest.TestCase):
 def test_manifest_is_not_permission_to_write(self):
  m=prepare_patch(propose("Build interface"),[{"path":"src/new.ts","content":"export const value=1"}],"a"*40)
  self.assertFalse(m["approved"]);self.assertFalse(m["repo_write"]);self.assertFalse(m["deploy"])
  self.assertEqual(m["tests_status"],"not_run")
 def test_path_traversal_rejected(self):
  with self.assertRaises(ValueError):prepare_patch(propose("code"),[{"path":"../private","content":"x"}],"a"*40)
 def test_duplicate_path_rejected(self):
  with self.assertRaises(ValueError):prepare_patch(propose("code"),[{"path":"x.ts","content":"1"},{"path":"x.ts","content":"2"}],"a"*40)
 def test_requires_pinned_sha(self):
  with self.assertRaises(ValueError):prepare_patch(propose("code"),[{"path":"x.ts","content":"1"}],"main")
if __name__=="__main__":unittest.main()
