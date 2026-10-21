"""GEM-078: Google-authenticated NEO Gemini session acceptance tests."""
import io
import os
import pathlib
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import gemini_private_web as web

class FakeHandler:
    path="/gemini/google"
    def __init__(self,body):
        self.rfile=io.BytesIO(body)
        self.headers={"Content-Length":str(len(body)),"Origin":"https://neo-crown-gem-staging.onrender.com","Host":"neo-crown-gem-staging.onrender.com"}
        self.status=None
        self.headers_out={}
        self.wfile=io.BytesIO()
    def respond(self,status,payload):
        self.status=status
        return status,payload
    def send_response(self,status):self.status=status
    def send_header(self,key,value):self.headers_out[key]=value
    def end_headers(self):pass

class GoogleSessionAcceptance(unittest.TestCase):
    def test_valid_identity_creates_secure_cookie(self):
        h=FakeHandler(b'{"credential":"valid-google-id-token"}')
        settings={"NEO_GEM_GOOGLE_CLIENT_ID":"test.apps.googleusercontent.com","NEO_GEM_GOOGLE_ALLOWED_SUB":"123456","CROWN_BRIDGE_TOKEN":"x"*40}
        with patch.dict(os.environ,settings,clear=True):
            with patch("gemini_google_auth.verify_google_credential",return_value="123456") as verify:
                web.post(h)
            self.assertEqual(h.status,200)
            cookie=h.headers_out["Set-Cookie"]
            self.assertIn("HttpOnly",cookie)
            self.assertIn("Secure",cookie)
            self.assertIn("SameSite=Strict",cookie)
            self.assertNotIn("valid-google-id-token",cookie)
            verify.assert_called_once_with("valid-google-id-token")
    def test_wrong_origin_rejected_before_token_validation(self):
        h=FakeHandler(b'{"credential":"token"}')
        h.headers["Origin"]="https://untrusted.example"
        settings={"NEO_GEM_GOOGLE_CLIENT_ID":"test.apps.googleusercontent.com","NEO_GEM_GOOGLE_ALLOWED_SUB":"123456","CROWN_BRIDGE_TOKEN":"x"*40}
        with patch.dict(os.environ,settings,clear=True):
            result=web.post(h)
        self.assertEqual(result[0],403)

if __name__=="__main__":
    unittest.main()
