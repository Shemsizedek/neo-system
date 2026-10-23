import os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gem_github_draft_pr as gh

class DraftPRTests(unittest.TestCase):
 def test_false_approval_rejected(self):
  with self.assertRaises(PermissionError):
   gh.validated_request(gh.REPO,"gem-development/"+"a"*16,gh.BASE,"NEO PR",False)
 def test_forged_true_approval_rejected(self):
  with self.assertRaises(PermissionError):
   gh.validated_request(gh.REPO,"gem-development/"+"a"*16,gh.BASE,"NEO PR",True)
 def test_other_repo_rejected(self):
  with self.assertRaises(ValueError):
   gh.validated_request("other/repo","gem-development/"+"a"*16,gh.BASE,"NEO PR",True)
 def test_branch_escape_rejected(self):
  with self.assertRaises(ValueError):
   gh.validated_request(gh.REPO,"main",gh.BASE,"NEO PR",True)
 def test_no_network_request_even_if_credentials_and_true_flag(self):
  with patch.dict(os.environ,{"GEM_DEV_GITHUB_TOKEN":"fake-secret"}):
   with patch("gem_github_draft_pr.urllib.request.urlopen") as request:
    with self.assertRaises(PermissionError):
     gh.create_draft_pr(gh.REPO,"gem-development/"+"a"*16,gh.BASE,"Review NEO",approved=True)
    request.assert_not_called()
if __name__=="__main__":unittest.main()
