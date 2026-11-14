"""Pure unit tests: no real Wi-Fi or external network access."""
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

modpath = Path(__file__).parents[1] / "diagnostics" / "connect-001.py"
spec = importlib.util.spec_from_file_location("neo_connect_001", modpath)
connect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(connect)


class Connect001Tests(unittest.TestCase):
    def test_signal_grades(self):
        self.assertEqual(connect.signal_grade(-51), "EXCELLENT")
        self.assertEqual(connect.signal_grade(-65), "GOOD")
        self.assertEqual(connect.signal_grade(-72), "FAIR")
        self.assertEqual(connect.signal_grade(-87), "WEAK")
        self.assertEqual(connect.signal_grade(None), "UNKNOWN")

    def test_missing_termux_api_is_unknown(self):
        with patch.object(connect.shutil, "which", return_value=None):
            info = connect.termux_wifi()
        self.assertEqual(info["status"], "NOT_AVAILABLE")
        self.assertNotIn("ssid", info)

    def test_strips_identifiers_from_api_output(self):
        response = type("Result", (), {
            "returncode": 0,
            "stdout": '{"rssi": -63, "ssid": "PRIVATE-NET", "bssid": "aa:bb:cc:dd:ee:ff", "ip": "10.0.0.2"}'
        })()
        with patch.object(connect.shutil, "which", return_value="/bin/termux-wifi-connectioninfo"), \
             patch.object(connect.subprocess, "run", return_value=response):
            info = connect.termux_wifi()
        self.assertEqual(info["signal"], "GOOD")
        for key in ("ssid", "bssid", "ip"):
            self.assertNotIn(key, info)

    def test_bad_api_payload_cannot_crash(self):
        response = type("Result", (), {"returncode": 0, "stdout": "not json"})()
        with patch.object(connect.shutil, "which", return_value="/bin/termux-wifi-connectioninfo"), \
             patch.object(connect.subprocess, "run", return_value=response):
            self.assertEqual(connect.termux_wifi()["signal"], "UNKNOWN")

    def test_assessment(self):
        wifi = {"signal": "WEAK"}
        self.assertIn("Wi-Fi", connect.assess(wifi, []))
        self.assertIn("Insufficient", connect.assess({"signal": "UNKNOWN"}, []))
        self.assertIn("passed", connect.assess({"signal":"GOOD"},
                          [{"dns":"PASS", "tls":"PASS"}]))


if __name__ == "__main__":
    unittest.main()
