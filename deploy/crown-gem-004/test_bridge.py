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
