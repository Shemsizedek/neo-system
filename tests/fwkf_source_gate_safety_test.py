"""Additional FWKF source audit safety/regression tests (no real archive needed)."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

script = Path(__file__).resolve().parents[1] / 'scripts' / 'fwkf_source_gate.py'
spec = importlib.util.spec_from_file_location('fwkf_source_gate', script)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class FWKFSourceSafetyTests(unittest.TestCase):
    def test_archive_unchanged_and_sensitive_path_flagged(self):
        with tempfile.TemporaryDirectory() as dirname:
            path = Path(dirname) / 'source.zip'
            with ZipFile(path, 'w') as z:
                z.writestr(gate.PROJECT_A+'/package.json', '{"scripts":{"build":"vite build"}}')
                z.writestr(gate.PROJECT_B+'/package.json', '{"scripts":{"build":"vite build"}}')
                z.writestr(gate.WAREHOUSE+'/README.md', 'warehouse')
                z.writestr(gate.PROJECT_A+'/backend/.env.production', 'DO_NOT_OUTPUT')
            raw_before = path.read_bytes()
            result = gate.audit(path)
            self.assertEqual(path.read_bytes(), raw_before)
            self.assertTrue(any(x['category']=='sensitive_filename_review' for x in result['warnings']))
            self.assertNotIn('DO_NOT_OUTPUT', str(result))

    def test_duplicate_normalized_path_rejected(self):
        with tempfile.TemporaryDirectory() as dirname:
            path = Path(dirname) / 'case-collision.zip'
            with ZipFile(path, 'w') as z:
                z.writestr(gate.PROJECT_A+'/src/App.tsx', 'first')
                z.writestr(gate.PROJECT_A+'/src/app.tsx', 'second')
            result = gate.audit(path)
            self.assertEqual(result['total_files'], 1)
            self.assertTrue(any(x['category']=='duplicate_archive_path' for x in result['warnings']))

    def test_missing_root_is_not_silently_accepted(self):
        with tempfile.TemporaryDirectory() as dirname:
            path = Path(dirname) / 'partial.zip'
            with ZipFile(path, 'w') as z:
                z.writestr(gate.PROJECT_B+'/package.json', '{}')
            result = gate.audit(path)
            self.assertIn(gate.PROJECT_A, result['missing_expected_roots'])
            self.assertIn(gate.WAREHOUSE, result['missing_expected_roots'])


if __name__ == '__main__':
    unittest.main()
