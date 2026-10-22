import importlib.util
import pathlib
import unittest
from unittest.mock import patch
path=pathlib.Path(__file__).with_name("verify_gemini.py")
spec=importlib.util.spec_from_file_location("verify_gemini",path)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class VerifyTests(unittest.TestCase):
    def test_missing_key(self):
        self.assertEqual(module.verify(api_key="")["status"],"missing_credential")
    def test_ok_does_not_expose_key(self):
        class Resp:
            def __enter__(self): return self
            def __exit__(self,*args): return False
            def read(self,n): return b'{"models":[{"name":"models/test"}]}'
        def opener(request,timeout):
            self.assertEqual(request.get_header("X-goog-api-key"),"placeholder-not-real")
            return Resp()
        out=module.verify(api_key="placeholder-not-real",opener=opener)
        self.assertEqual(out["status"],"authenticated")
        self.assertNotIn("placeholder-not-real",str(out))
if __name__=="__main__": unittest.main()
