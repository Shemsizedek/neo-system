import importlib.util
import pathlib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("bridge", pathlib.Path(__file__).with_name("bridge.py"))
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)

class BridgeTests(unittest.TestCase):
    def test_health(self):
        status, data = bridge.dispatch("/health")
        self.assertEqual(status,200)
        self.assertEqual(data["mode"],"read-only")
    def test_gemini_secret_readiness_does_not_disclose_key(self):
        with patch.dict("os.environ", {"GEMINI_API_KEY":"test-placeholder-do-not-use"}, clear=True):
            status, data = bridge.dispatch("/health")
            self.assertEqual(status, 200)
            self.assertTrue(data["gemini_key_present"])
            self.assertFalse(data["gemini_execution_enabled"])
            self.assertNotIn("test-placeholder-do-not-use", str(data))
    def test_gemini_verification_route_is_restricted(self):
        import inspect
        code=inspect.getsource(bridge.Handler.do_POST)
        self.assertIn('/v1/gemini/verify',code)
        self.assertIn('compare_digest',code)
        self.assertIn('request body prohibited',code)
    def test_unified_invalid_identifier(self):
        code, value = bridge.dispatch("/v1/intelligence/bitcoin/invalid")
        self.assertEqual(code,400)
    def test_unified_bitcoin_mismatch_not_certified(self):
        with patch.object(bridge,"upstream",return_value=(200,{"data":{"txid":"b"*64}})):
            code,value=bridge.dispatch("/v1/intelligence/bitcoin/"+"a"*64)
        self.assertEqual(code,200)
        self.assertFalse(value["identity_match"])
        self.assertFalse(value["independently_certified"])
    def test_unified_xcp_identity(self):
        with patch.object(bridge,"upstream",return_value=(200,{"data":{"asset":"XCP"}})):
            code,value=bridge.dispatch("/v1/intelligence/counterparty/XCP")
        self.assertEqual(code,200)
        self.assertTrue(value["identity_match"])
        self.assertFalse(value["verified"])
    def test_staging_rate_limit(self):
        with bridge.RATE_LOCK:
            bridge.RATE_STATE.clear()
        for n in range(30):
            self.assertTrue(bridge.rate_allowed("test-peer", now=10.0))
        self.assertFalse(bridge.rate_allowed("test-peer", now=10.0))
        self.assertTrue(bridge.rate_allowed("test-peer", now=71.0))

    def test_http_rate_limit_returns_429(self):
        from types import SimpleNamespace
        responses=[]
        stub=SimpleNamespace(client_address=("rate-test",1234),respond=lambda code,value:responses.append((code,value)))
        with bridge.RATE_LOCK:
            bridge.RATE_STATE.clear()
        for _ in range(30):
            self.assertTrue(bridge.rate_allowed("rate-test",now=bridge.time.monotonic()))
        bridge.Handler.do_GET(stub)
        self.assertEqual(responses[0][0],429)

    def test_rate_limit_memory_capacity_and_expiry(self):
        with bridge.RATE_LOCK:
            bridge.RATE_STATE.clear()
            bridge.RATE_STATE.update({str(i):(10.0,1) for i in range(4096)})
        self.assertFalse(bridge.rate_allowed("new-peer",now=20.0))
        self.assertTrue(bridge.rate_allowed("new-peer",now=71.0))
        with bridge.RATE_LOCK:
            self.assertEqual(len(bridge.RATE_STATE),1)
            bridge.RATE_STATE.clear()

    def test_shared_quota_missing_url_fails_closed(self):
        with patch.dict("os.environ", {"CROWN_SHARED_QUOTA_ENABLED":"1","CROWN_VALKEY_URL":""},clear=True):
            self.assertFalse(bridge.quota_allowed("synthetic-peer"))
    def test_disabled_shared_quota_uses_local_staging_limiter(self):
        with patch.dict("os.environ", {"CROWN_SHARED_QUOTA_ENABLED":"0"},clear=True):
            with patch.object(bridge,"rate_allowed",return_value=True) as local:
                self.assertTrue(bridge.quota_allowed("synthetic-peer"))
                local.assert_called_once_with("synthetic-peer")
    def test_unknown_route(self):
        self.assertEqual(bridge.dispatch("/v1/bitcoin/tx/not-a-transaction")[0],404)
    def test_no_upstream(self):
        with patch.dict("os.environ",{},clear=True):
            self.assertEqual(bridge.dispatch("/v1/bitcoin/tx/"+"a"*64)[0],503)
    def test_reject_unallowlisted(self):
        with patch.dict("os.environ",{"BITCOIN_API_BASE":"https://example.org","CROWN_ALLOWED_HOSTS":"blockstream.info"},clear=True):
            with self.assertRaises(ValueError):
                bridge.base_url("BITCOIN_API_BASE")
    def test_reject_http(self):
        with patch.dict("os.environ",{"BITCOIN_API_BASE":"http://example.org","CROWN_ALLOWED_HOSTS":"example.org"},clear=True):
            with self.assertRaises(ValueError):
                bridge.base_url("BITCOIN_API_BASE")
    def test_no_redirect(self):
        self.assertIsNone(bridge.DenyRedirect().redirect_request(None,None,302,"",None,"https://example.org"))

    def test_counterparty_port_requires_exact_host(self):
        from unittest.mock import patch
        public_dns=[(None,None,None,None,("1.1.1.1",4000))]
        with patch.dict("os.environ",{"COUNTERPARTY_API_BASE":"https://api.counterparty.io:4000/v2","CROWN_ALLOWED_HOSTS":"api.counterparty.io"},clear=True),patch.object(bridge.socket,"getaddrinfo",return_value=public_dns):
            self.assertEqual(bridge.base_url("COUNTERPARTY_API_BASE"),"https://api.counterparty.io:4000/v2")
        with patch.dict("os.environ",{"COUNTERPARTY_API_BASE":"https://evil.example:4000/v2","CROWN_ALLOWED_HOSTS":"evil.example"},clear=True):
            with self.assertRaises(ValueError): bridge.base_url("COUNTERPARTY_API_BASE")
if __name__=="__main__": unittest.main()
