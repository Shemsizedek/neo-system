import io
import json
import pathlib
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gem_pr_status
import gemini_private_web

class PRStatusTests(unittest.TestCase):
 def test_allowlisted_source(self):
  self.assertEqual(gem_pr_status.URL,"https://api.github.com/repos/Shemsizedek/neo-system/pulls/1060")
 def test_success_restricted_fields(self):
  class Reply:
   def __enter__(self):return io.BytesIO(json.dumps({"number":1060,"state":"open","draft":True,"merged":False,"updated_at":"2026-10-22T12:00:00Z","token":"SECRET"}).encode())
   def __exit__(self,*args):return False
  status,data=gem_pr_status.fetch_status(opener=lambda req,timeout:Reply())
  self.assertEqual(status,200)
  self.assertTrue(data["draft"])
  self.assertNotIn("token",data)
 def test_failure_is_sanitized(self):
  def failure(req,timeout):raise OSError("secret internal details")
  status,data=gem_pr_status.fetch_status(opener=failure)
  self.assertEqual(status,502)
  self.assertNotIn("secret",str(data))
 def test_private_panel_read_only(self):
  html=gemini_private_web.HTML
  self.assertIn("/gemini/pr-status",html)
  self.assertNotIn("/gemini/merge",html)
if __name__=="__main__":unittest.main()
