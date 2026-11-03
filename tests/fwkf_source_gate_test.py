"""Self-contained negative/path-handling test for FWKF archive audit."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

script = Path(__file__).resolve().parents[1] / 'scripts' / 'fwkf_source_gate.py'
spec = importlib.util.spec_from_file_location('fwkf_source_gate', script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FWKFSourceGateTest(unittest.TestCase):
    def test_read_only_inventory_and_diff(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            archive = folder / 'input.zip'
            entries = {
                module.PROJECT_A+'/package.json': json.dumps({'name': 'institute', 'scripts': {'build': 'vite build'}}),
                module.PROJECT_B+'/package.json': json.dumps({'name': 'foundation', 'scripts': {'build': 'vite build'}}),
                module.PROJECT_A+'/src/index.ts': 'one',
                module.PROJECT_B+'/src/index.ts': 'two',
                module.PROJECT_A+'/src/common.ts': 'shared',
                module.PROJECT_B+'/src/common.ts': 'shared',
                module.WAREHOUSE+'/README.md': 'warehouse',
                '../escape.txt': 'escape'
            }
            with ZipFile(archive, 'w') as z:
                for path, content in entries.items():
                    z.writestr(path, content)
            result = module.audit(archive)
            self.assertEqual(result['total_files'], 7)
            self.assertEqual(result['missing_expected_roots'], [])
            self.assertEqual(result['frontend_comparison']['shared_same_count'], 1)
            self.assertEqual(result['frontend_comparison']['shared_different'], ['package.json', 'src/index.ts'])
            self.assertTrue(any(w['category']=='unsafe_archive_path' for w in result['warnings']))
            self.assertFalse((folder / 'escape.txt').exists())


if __name__ == '__main__':
    unittest.main()
