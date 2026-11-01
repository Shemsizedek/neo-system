#!/usr/bin/env python3
"""Fail-closed review of imported FWKF public release (no network, no mutation)."""
import argparse
import hashlib
import json
import re
from pathlib import Path

EXPECTED = {
    "index.html",
    "robots.txt",
    "favicon.svg",
    "icons.svg",
    "fwkf-release-guard.js",
    "assets/index-C6xF2f0w.js",
    "assets/index-CECYfagt.css",
}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def inspect_release(root):
    findings = []
    root = Path(root)
    actual = sorted(str(f.relative_to(root)) for f in root.rglob("*") if f.is_file())
    missing = sorted(EXPECTED - set(actual))
    if missing:
        findings.append({"severity": "error", "code": "missing_required", "paths": missing})
    pngs = [p for p in actual if p.startswith("fwkf-assets/") and p.lower().endswith(".png")]
    if len(pngs) != 27:
        findings.append({"severity": "error", "code": "png_count", "actual": len(pngs), "expected": 27})
    for name in pngs:
        if not (root / name).read_bytes().startswith(PNG_SIGNATURE):
            findings.append({"severity": "error", "code": "png_signature", "path": name})
    if not missing:
        html = (root / "index.html").read_text(encoding="utf-8")
        js = (root / "assets/index-C6xF2f0w.js").read_text(encoding="utf-8")
        guard = (root / "fwkf-release-guard.js").read_text(encoding="utf-8")
        robots = (root / "robots.txt").read_text(encoding="utf-8")
        for label, ok in {
            "foundation_title": "Free World Knowledge Foundation" in html,
            "spa_root": '<div id="root"></div>' in html,
            "compiled_js_link": "/assets/index-C6xF2f0w.js" in html,
            "compiled_css_link": "/assets/index-CECYfagt.css" in html,
            "form_guard_link": "/fwkf-release-guard.js" in html,
            "form_guard_logic": "Contact submissions are temporarily unavailable" in guard and "preventDefault()" in guard,
            "noindex_meta": "noindex,nofollow" in html,
            "noindex_robots": "Disallow: /" in robots,
            "no_localhost_api": not any(p in js for p in ("127.0.0.1:8970", "localhost:8970")),
            "no_temporary_shell": "This is an interim deployment shell" not in html,
        }.items():
            if not ok:
                findings.append({"severity": "error", "code": label})
    return {
        "passed": len(findings) == 0,
        "total_files": len(actual),
        "asset_png_count": len(pngs),
        "findings": findings,
        "scope": "staging static-asset integrity only; does not certify rights, programs, live HTTPS or backend security",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="apps/fwkf-worldcafe/public")
    args = parser.parse_args()
    result = inspect_release(args.root)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
