import io
import sys
import pathlib
import unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_chat

class TestGeminiChat(unittest.TestCase):
    def fake(self,data):
        class Handler: pass
        h=Handler()
        h.rfile=io.BytesIO(data)
        h.headers={"Content-Length":str(len(data))}
        return h
    def test_valid_chat(self):
        h=self.fake(b'{"message":"Explain XCP"}')
        with patch("gemini_runtime.run",return_value={"response":{"parts":[{"text":"Read-only result"}]},"used_tools":["neo_crown_counterparty_asset"]}):
            status,out=gemini_chat.handle_chat(h)
        self.assertEqual(status,200)
        self.assertEqual(out["response"],"Read-only result")
        self.assertFalse(out["independently_certified"])
    def test_bad_json(self):
        status,_=gemini_chat.handle_chat(self.fake(b'{broken'))
        self.assertEqual(status,400)
    def test_message_limit(self):
        status,_=gemini_chat.handle_chat(self.fake(b'{"message":""}'))
        self.assertEqual(status,400)
    def test_failure_redacted(self):
        h=self.fake(b'{"message":"lookup"}')
        with patch("gemini_runtime.run",side_effect=RuntimeError("SECRET")):
            status,out=gemini_chat.handle_chat(h)
        self.assertEqual(status,502)
        self.assertNotIn("SECRET",str(out))

if __name__=="__main__":unittest.main()
