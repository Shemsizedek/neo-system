import io
import json
import pathlib
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_client

class ClientTests(unittest.TestCase):
    def test_requires_https(self):
        with self.assertRaises(ValueError):
            gemini_client.ask("hello",base_url="http://untrusted.example",token="x"*32)
    def test_no_token(self):
        with self.assertRaises(ValueError):
            gemini_client.ask("hello",base_url="https://neo.example",token="short")
    def test_authenticated_request(self):
        class Response:
            def __enter__(self): return io.BytesIO(b'{"response":"XCP found","tools_used":["neo_crown_counterparty_asset"]}')
            def __exit__(self,*args):pass
        with patch("gemini_client.urllib.request.urlopen",return_value=Response()) as open_url:
            response=gemini_client.ask("find XCP",base_url="https://neo.example",token="x"*32)
        self.assertEqual(response["response"],"XCP found")
        req=open_url.call_args.args[0]
        self.assertEqual(req.get_method(),"POST")
        self.assertEqual(req.get_header("Authorization"),"Bearer "+"x"*32)
        self.assertIn("/v1/gemini/chat",req.full_url)
if __name__=="__main__":unittest.main()
