import importlib.util
import pathlib
import unittest
from unittest.mock import patch
p=pathlib.Path(__file__).with_name("valkey_preflight.py")
spec=importlib.util.spec_from_file_location("valkey_preflight",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class PreflightTests(unittest.TestCase):
    def test_no_url(self):
        with patch.dict("os.environ",{},clear=True):
            self.assertEqual(m.check()["reason"],"private_url_missing")
    def test_healthy_connection(self):
        class Fake:
            def ping(self): return True
        with patch.dict("os.environ",{"CROWN_VALKEY_URL":"redis://private-host"},clear=True):
            with patch("shared_quota.allowed",return_value=True):
                self.assertTrue(m.check(Fake())["ok"])
    def test_failed_connection_is_safe(self):
        class Broken:
            def ping(self): raise RuntimeError("secret-containing exception")
        with patch.dict("os.environ",{"CROWN_VALKEY_URL":"redis://private-host"},clear=True):
            result=m.check(Broken())
        self.assertFalse(result["ok"])
        self.assertNotIn("secret",str(result))
