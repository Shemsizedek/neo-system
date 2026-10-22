import importlib.util
import pathlib
import unittest
from unittest.mock import patch
import sys

ROOT = pathlib.Path(__file__).parent
sys.path.insert(0,str(ROOT))
import gemini_runtime as runtime

class RuntimeTests(unittest.TestCase):
    def test_rejects_unconfigured_key(self):
        with patch.object(runtime, "API_KEY", ""):
            with self.assertRaises(RuntimeError):
                runtime.generate([{"role":"user","parts":[{"text":"hi"}]}])
    def test_one_allowed_call_roundtrip(self):
        initial={"candidates":[{"content":{"role":"model","parts":[{"functionCall":{"name":"neo_crown_counterparty_asset","args":{"asset":"XCP"}}}]}}]}
        final={"candidates":[{"content":{"role":"model","parts":[{"text":"Response received"}]}}]}
        with patch.object(runtime,"generate",side_effect=[initial,final]) as gen, patch.object(runtime,"call_crown_tool",return_value={"verified":False,"data":{"asset":"XCP"}}) as bridge:
            result=runtime.run("Lookup XCP")
        self.assertEqual(result["used_tools"],["neo_crown_counterparty_asset"])
        self.assertFalse(result["certified"])
        self.assertTrue(result["tool_evidence"][0]["asset_identity_match"])
        self.assertFalse(result["tool_evidence"][0]["independent_verification"])
        self.assertEqual(gen.call_count,2)
        bridge.assert_called_once_with("neo_crown_counterparty_asset",{"asset":"XCP"})
    def test_unapproved_call_fails_closed(self):
        initial={"candidates":[{"content":{"role":"model","parts":[{"functionCall":{"name":"send_bitcoin","args":{}}}]}}]}
        with patch.object(runtime,"generate",return_value=initial), patch.object(runtime,"call_crown_tool") as bridge:
            with self.assertRaises(RuntimeError):
                runtime.run("Send bitcoin")
            bridge.assert_not_called()

    def test_function_call_id_is_preserved(self):
        initial={"candidates":[{"content":{"role":"model","parts":[{"functionCall":{"id":"call-123","name":"neo_crown_counterparty_asset","args":{"asset":"XCP"}}}]}}]}
        final={"candidates":[{"content":{"role":"model","parts":[{"text":"Done"}]}}]}
        with patch.object(runtime,"generate",side_effect=[initial,final]) as gen, patch.object(runtime,"call_crown_tool",return_value={"verified":False,"data":{"asset":"XCP"}}):
            runtime.run("Lookup XCP")
        sent=gen.call_args_list[1].args[0]
        self.assertEqual(sent[-1]["parts"][0]["functionResponse"]["id"],"call-123")

if __name__=="__main__":
    unittest.main()
