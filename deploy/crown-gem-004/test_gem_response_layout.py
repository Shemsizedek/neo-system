import pathlib
import sys
import unittest
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import gemini_private_web as ui

class ResponseLayoutTests(unittest.TestCase):
    def test_text_only_rendering(self):
        self.assertIn("h.textContent=heading[2]", ui.HTML)
        self.assertIn("p.textContent=line", ui.HTML)
        self.assertNotIn("innerHTML", ui.HTML)

    def test_headings_and_bullets(self):
        self.assertIn("const heading=line.match", ui.HTML)
        self.assertIn("const bullet=line.match", ui.HTML)

    def test_operator_login_and_review(self):
        self.assertIn("googleSignIn", ui.HTML)
        self.assertIn("Review it and press Send", ui.HTML)

if __name__ == "__main__":
    unittest.main()
