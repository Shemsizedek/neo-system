#!/usr/bin/env python3
"""Read-only inventory and canonical-source comparison for FWKF recovery ZIPs.

Does not extract files, run uploaded code, publish secrets or choose a winner.
Python 3.9+ stdlib only.
"""
import argparse
import hashlib
import json
import posixpath
from collections import Counter
from pathlib import Path
from zipfile import BadZipFile, ZipFile

PROJECT_A = 'Project_1_freedom_knowledge_institute'
PROJECT_B = 'Project_2_free-world-knowledge-foundation'
WAREHOUSE = 'Project_3_FWKF_Block_Asset_Warehouse_2026-10-30'
EXPECTED = (PROJECT_A, PROJECT_B, WAREHOUSE)
SENSITIVE = ('.env', 'credential', 'secret', 'private_key', 'id_rsa', '.pem', '.p12', '.pfx', 'contact_submissions')


def audit(path):
    """Return filename-only metadata, SHA hashes, and frontend comparisons."""
    files = {}
    warnings = []
    with ZipFile(path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            normalized = info.filename.replace('\\', '/')
            parts = normalized.split('/')
            if (normalized.startswith('/') or any(x in ('', '.', '..') for x in parts)
                    or ':' in parts[0] or posixpath.normpath(normalized) != normalized):
                warnings.append({'category': 'unsafe_archive_path', 'path': normalized})
                continue
            folded = normalized.casefold()
            if folded in (x.casefold() for x in files):
                warnings.append({'category': 'duplicate_archive_path', 'path': normalized})
                continue
            data = archive.read(info)
            files[normalized] = {'size_bytes': info.file_size, 'sha256': hashlib.sha256(data).hexdigest()}
            if any(k in normalized.lower() for k in SENSITIVE):
                warnings.append({'category': 'sensitive_filename_review', 'path': normalized})
        root_counts = Counter(key.split('/', 1)[0] for key in files)

        def relative_files(root):
            return {k[len(root)+1:]: v for k, v in files.items() if k.startswith(root+'/')}

        a, b = relative_files(PROJECT_A), relative_files(PROJECT_B)
        overlap = set(a) & set(b)
        different = sorted(p for p in overlap if a[p]['sha256'] != b[p]['sha256'])
        same = sorted(p for p in overlap if a[p]['sha256'] == b[p]['sha256'])
        packages = {}
        for root in (PROJECT_A, PROJECT_B):
            name = root+'/package.json'
            if name not in files:
                warnings.append({'category': 'missing_package_manifest', 'path': name})
                continue
            try:
                pkg = json.loads(archive.read(next(
                    x for x in archive.infolist() if x.filename.replace('\\', '/') == name)))
                packages[root] = {
                    'name': pkg.get('name'),
                    'scripts': sorted(pkg.get('scripts', {})),
                    'dependency_names': sorted(
                        set(pkg.get('dependencies', {})) | set(pkg.get('devDependencies', {})))
                }
            except (ValueError, KeyError, StopIteration):
                warnings.append({'category': 'unreadable_package_manifest', 'path': name})
    return {
        'archive_sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest(),
        'total_files': len(files),
        'roots': dict(sorted(root_counts.items())),
        'missing_expected_roots': [r for r in EXPECTED if not root_counts.get(r)],
        'frontend_comparison': {
            'shared_same_count': len(same),
            'shared_different': different,
            'only_in_institute': sorted(set(a)-set(b)),
            'only_in_foundation': sorted(set(b)-set(a))
        },
        'packages': packages,
        'warnings': warnings,
        'decision': 'UNDECIDED: assess functionality, licensing, content, and build results before selecting canonical source'
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path, help='Original source ZIP (read-only)')
    parser.add_argument('--output', type=Path, help='Write the audit report as JSON')
    args = parser.parse_args()
    try:
        result = audit(args.archive)
    except (OSError, BadZipFile, ValueError) as err:
        parser.error(str(err))
    report = json.dumps(result, indent=2) + '\n'
    if args.output:
        args.output.write_text(report, encoding='utf-8')
    else:
        print(report, end='')
    if result['missing_expected_roots']:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
