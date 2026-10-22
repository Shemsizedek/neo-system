import importlib.util
import pathlib
import unittest
spec=importlib.util.spec_from_file_location("shared_quota",pathlib.Path(__file__).with_name("shared_quota.py"))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SharedQuotaTests(unittest.TestCase):
    def test_admits_and_hashes_principal(self):
        class Client:
            def eval(self, script, numkeys, key, window, limit):
                self.assert_values=(script,numkeys,key,window,limit)
                return 1
        c=Client()
        self.assertTrue(module.allowed(c,"test-client"))
        self.assertNotIn("test-client",c.assert_values[2])
        self.assertEqual(c.assert_values[3:],(60,30))
    def test_denies_backend_failure(self):
        class Broken:
            def eval(self,*a): raise ConnectionError("offline")
        self.assertFalse(module.allowed(Broken(),"test-client"))
    def test_denies_missing_client(self):
        self.assertFalse(module.allowed(None,"test-client"))
    def test_denies_exhausted_quota(self):
        class Limited:
            def eval(self,*a):return 0
        self.assertFalse(module.allowed(Limited(),"test-client"))
