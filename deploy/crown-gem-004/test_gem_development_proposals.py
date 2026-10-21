import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_development_proposals import propose

class ProposalTests(unittest.TestCase):
 def test_draft_never_authorizes_execution(self):
  r=propose("Create a Hage parser")
  self.assertEqual(r["state"],"draft")
  self.assertFalse(r["execution_authorized"])
  self.assertFalse(r["deployment_authorized"])
  self.assertIn("review_diff",r["workflow"])
 def test_rejects_invalid_project(self):
  with self.assertRaises(ValueError):propose("code",project="../unsafe")
 def test_rejects_empty_request(self):
  with self.assertRaises(ValueError):propose(" ")
if __name__=="__main__":unittest.main()
