import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_development_proposals import propose
from gem_github_review import prepare_patch
from gem_pr_bridge import development_pr_plan
class GateTests(unittest.TestCase):
 def test_draft_never_has_write_authority(self):
  manifest=prepare_patch(propose("improve Gemini"),[{"path":"src/example.ts","content":"export const x=1"}],"a"*40)
  plan=development_pr_plan(manifest)
  self.assertTrue(plan["draft"]);self.assertFalse(plan["write_authorized"])
  self.assertFalse(plan["merge_authorized"]);self.assertFalse(plan["deploy_authorized"])
 def test_external_repo_denied(self):
  manifest=prepare_patch(propose("x"),[{"path":"a.py","content":"x"}],"a"*40)
  with self.assertRaises(ValueError):development_pr_plan(manifest,repository="other/repo")
if __name__=="__main__":unittest.main()
