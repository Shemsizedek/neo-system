import io,json,os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gem_github_draft_pr as gh

class DraftPRTests(unittest.TestCase):
 def test_requires_explicit_approval(self):
  with self.assertRaises(PermissionError):
   gh.validated_request(gh.REPO,"gem-development/"+"a"*16,gh.BASE,"NEO PR",False)
 def test_rejects_other_repo(self):
  with self.assertRaises(ValueError):
   gh.validated_request("attacker/repo","gem-development/"+"a"*16,gh.BASE,"NEO PR",True)
 def test_rejects_branch_escape(self):
  with self.assertRaises(ValueError):
   gh.validated_request(gh.REPO,"main",gh.BASE,"NEO PR",True)
 def test_requires_private_credential(self):
  with patch.dict(os.environ,{},clear=True):
   with self.assertRaises(RuntimeError):
    gh.create_draft_pr(gh.REPO,"gem-development/"+"a"*16,gh.BASE,"Review NEO",approved=True)
 def test_created_pr_is_draft(self):
  class Response:
   def __enter__(self):return io.BytesIO(b'{"draft":true,"html_url":"https://github.com/Shemsizedek/neo-system/pull/123","number":123}')
   def __exit__(self,*args):return None
  with patch.dict(os.environ,{"GEM_DEV_GITHUB_TOKEN":"test-private-token"}):
   with patch("gem_github_draft_pr.urllib.request.urlopen",return_value=Response()) as call:
    result=gh.create_draft_pr(gh.REPO,"gem-development/"+"a"*16,gh.BASE,"Review NEO",approved=True)
  request=call.call_args.args[0]
  self.assertTrue(json.loads(request.data)["draft"])
  self.assertEqual(result["draft"],True)
  self.assertEqual(result["deployed"],False)
if __name__=="__main__":unittest.main()
