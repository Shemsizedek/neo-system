import os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_google_auth as auth
import gemini_private_web as web
class VerifiedEmailTests(unittest.TestCase):
 def test_email_only_enables_login_page(self):
  with patch.dict(os.environ,{"NEO_GEM_GOOGLE_CLIENT_ID":"client.apps.googleusercontent.com","NEO_GEM_GOOGLE_ALLOWED_EMAIL":"owner@example.com","CROWN_BRIDGE_TOKEN":"x"*40},clear=True):
   self.assertTrue(web.configured())
 def test_verified_email_authorized(self):
  env={"NEO_GEM_GOOGLE_CLIENT_ID":"client.apps.googleusercontent.com","NEO_GEM_GOOGLE_ALLOWED_EMAIL":"Owner@Example.com"}
  claims={"iss":"https://accounts.google.com","sub":"123456789","email":"owner@example.com","email_verified":True}
  with patch.dict(os.environ,env,clear=True),patch("google.oauth2.id_token.verify_oauth2_token",return_value=claims):
   self.assertEqual(auth.verify_google_credential("test-token"),"123456789")
 def test_unverified_email_rejected(self):
  env={"NEO_GEM_GOOGLE_CLIENT_ID":"client.apps.googleusercontent.com","NEO_GEM_GOOGLE_ALLOWED_EMAIL":"owner@example.com"}
  claims={"iss":"https://accounts.google.com","sub":"123","email":"owner@example.com","email_verified":False}
  with patch.dict(os.environ,env,clear=True),patch("google.oauth2.id_token.verify_oauth2_token",return_value=claims):
   with self.assertRaises(ValueError):auth.verify_google_credential("test-token")
 def test_wrong_email_rejected(self):
  env={"NEO_GEM_GOOGLE_CLIENT_ID":"client.apps.googleusercontent.com","NEO_GEM_GOOGLE_ALLOWED_EMAIL":"owner@example.com"}
  claims={"iss":"https://accounts.google.com","sub":"123","email":"other@example.com","email_verified":True}
  with patch.dict(os.environ,env,clear=True),patch("google.oauth2.id_token.verify_oauth2_token",return_value=claims):
   with self.assertRaises(ValueError):auth.verify_google_credential("test-token")
if __name__=="__main__":unittest.main()
