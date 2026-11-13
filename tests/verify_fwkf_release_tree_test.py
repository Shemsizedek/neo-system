"""Synthetic source-only tests for FWKF static release tree validation."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

script = Path(__file__).resolve().parents[1] / "scripts" / "verify_fwkf_release_tree.py"
spec = importlib.util.spec_from_file_location("verify_fwkf_release_tree", script)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class TestReleaseTree(unittest.TestCase):
    def test_rejects_temporary_shell(self):
        with tempfile.TemporaryDirectory() as p:
            root = Path(p)
            (root / "index.html").write_text("This is an interim deployment shell", encoding="utf-8")
            result = gate.inspect_release(root)
            self.assertFalse(result["passed"])
            self.assertTrue(any(f["code"] == "missing_required" for f in result["findings"]))

    def test_accepts_synthetic_guarded_release(self):
        with tempfile.TemporaryDirectory() as p:
            root = Path(p)
            for name in gate.EXPECTED:
                dest = root / name
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text("", encoding="utf-8")
            (root/"index.html").write_text(
                'Free World Knowledge Foundation <div id="root"></div>'
                '/assets/index-C6xF2f0w.js /assets/index-CECYfagt.css'
                '/fwkf-release-guard.js noindex,nofollow', encoding="utf-8")
            (root/"fwkf-release-guard.js").write_text(
                "Contact submissions are temporarily unavailable;event.preventDefault()",
                encoding="utf-8")
            (root/"robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
            assets = root / "fwkf-assets"
            assets.mkdir()
            for i in range(27):
                (assets/f"img{i:02d}.png").write_bytes(gate.PNG_SIGNATURE+b"test")
            result = gate.inspect_release(root)
            self.assertTrue(result["passed"], str(result))


if __name__ == "__main__":
    unittest.main()
