"""Unit tests for the Gemini developer adapter: no live secrets/network required."""
import importlib.util
import pathlib
import unittest
from unittest.mock import patch

MODULE_PATH = pathlib.Path(__file__).with_name("gemini_adapter.py")
spec = importlib.util.spec_from_file_location("crown_gemini_adapter", MODULE_PATH)
gemini = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gemini)

class GeminiAdapterTests(unittest.TestCase):
    def test_declarations_are_read_only(self):
        names = {d["name"] for d in gemini.TOOL_DECLARATIONS}
        self.assertEqual(names, {"neo_crown_bitcoin_transaction", "neo_crown_counterparty_asset"})
        self.assertTrue(all("required" in d["parameters"] for d in gemini.TOOL_DECLARATIONS))
    def test_refuses_missing_credentials(self):
        with patch.object(gemini, "BRIDGE_URL", ""), patch.object(gemini, "TOKEN", ""):
            with self.assertRaises(RuntimeError):
                gemini.call_crown_tool("neo_crown_bitcoin_transaction", {"txid": "a"*64})
    def test_rejects_bad_input_before_network(self):
        with patch.object(gemini, "BRIDGE_URL", "https://example.org"), patch.object(gemini, "TOKEN", "a"*40):
            with self.assertRaises(ValueError):
                gemini.call_crown_tool("neo_crown_bitcoin_transaction", {"txid": "invalid"})
            with self.assertRaises(ValueError):
                gemini.call_crown_tool("neo_crown_counterparty_asset", {"asset": "../../private"})
            with self.assertRaises(ValueError):
                gemini.call_crown_tool("send_transaction", {})
    def test_valid_transaction_path(self):
        class FakeResponse:
            def __enter__(self): return self
            def __exit__(self,*args): return False
            def read(self, _): return b'{"verified": false}'
        with patch.object(gemini, "BRIDGE_URL", "https://example.org"), patch.object(gemini, "TOKEN", "a"*40), patch("urllib.request.urlopen", return_value=FakeResponse()) as opened:
            result=gemini.call_crown_tool("neo_crown_bitcoin_transaction", {"txid": "a"*64})
            request=opened.call_args[0][0]
            self.assertEqual(request.full_url,"https://example.org/v1/bitcoin/tx/"+"a"*64)
            self.assertFalse(result["verified"])

if __name__ == "__main__":
    unittest.main()
