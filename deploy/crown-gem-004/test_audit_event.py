import importlib.util
import pathlib
import unittest
p=pathlib.Path(__file__).with_name("audit_event.py")
spec=importlib.util.spec_from_file_location("audit_event",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AuditSchemaTests(unittest.TestCase):
    def test_redacts_asset_identifier_and_query(self):
        r=m.serialized("GET","/v1/intelligence/bitcoin/"+"a"*64+"?token=secret",429,10)
        self.assertNotIn("secret",r)
        self.assertNotIn("a"*64,r)
        self.assertIn("crown.audit.v1",r)
    def test_unknown_route_does_not_log_path(self):
        self.assertEqual(m.event("GET","/private/secret",401,10)["route_family"],"other")
    def test_deterministic_schema(self):
        self.assertEqual(m.event("GET","/health",200,10)["time"],10)
