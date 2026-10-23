import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_approval_dashboard import render_review
class ReviewDashboardTests(unittest.TestCase):
 def setUp(self):
  self.p=dict(repository="Shemsizedek/neo-system",base="feat/crown-gem-003-staging-bridge",head="gem-development/"+"a"*16,commit="b"*40,manifest_digest="a"*64,title="Review <script>alert(1)</script>")
 def test_escapes_injected_html(self):
  out=render_review(self.p)
  self.assertIn("&lt;script&gt;",out);self.assertNotIn("<script>",out)
 def test_read_only(self):
  out=render_review(self.p)
  self.assertNotIn("<button",out);self.assertNotIn("<form",out)
  self.assertIn("Approval and draft PR creation are unavailable",out)
 def test_rejects_wrong_repo(self):
  self.p["repository"]="other/repo"
  with self.assertRaises(ValueError):render_review(self.p)
 def test_rejects_unpinned_commit(self):
  self.p["commit"]="main"
  with self.assertRaises(ValueError):render_review(self.p)
if __name__=="__main__":unittest.main()
