#!/usr/bin/env python3
"""Securely import FWKF public static release ZIP into an isolated Render publish directory.

No network, no git commits, no deployment or DNS changes; ZIP supplied by the operator.
Run on a feature branch after checking the release contents and provenance.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile

REQUIRED = (
    "index.html", "robots.txt", "fwkf-release-guard.js",
    "favicon.svg", "icons.svg", "assets/index-CECYfagt.css",
    "assets/index-C6xF2f0w.js",
)
EXTENSIONS = {".html", ".txt", ".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp"}
MAX_SINGLE_FILE_BYTES = 4 * 1024 * 1024
MAX_TOTAL_BYTES = 25 * 1024 * 1024


def validate(archive):
    warnings = []
    staged = {}
    total = 0
    for member in archive.infolist():
        if member.is_dir():
            continue
        path = member.filename.replace("\\", "/")
        posix = PurePosixPath(path)
        if posix.is_absolute() or path.startswith("/") or any(x in ("", ".", "..") for x in path.split("/")) or ":" in path.split("/")[0]:
            raise ValueError(f"unsafe archive path: {path}")
        if path.casefold() in (x.casefold() for x in staged):
            raise ValueError(f"duplicate archive path: {path}")
        if posix.suffix.lower() not in EXTENSIONS:
            raise ValueError(f"unexpected file type in public package: {path}")
        if member.file_size > MAX_SINGLE_FILE_BYTES:
            raise ValueError(f"file exceeds allowed size: {path}")
        total += member.file_size
        if total > MAX_TOTAL_BYTES:
            raise ValueError("release exceeds size limit")
        data = archive.read(member)
        staged[path] = data
    for name in REQUIRED:
        if name not in staged:
            raise ValueError(f"missing mandatory release file: {name}")
    if len([x for x in staged if x.endswith(".png")]) != 27:
        raise ValueError("expected the 27 recovered public section images")
    html = staged["index.html"].decode("utf-8")
    js = staged["assets/index-C6xF2f0w.js"].decode("utf-8")
    guard = staged["fwkf-release-guard.js"].decode("utf-8")
    if "Free World Knowledge Foundation" not in html:
        raise ValueError("page title/metadata must identify Free World Knowledge Foundation")
    if "noindex,nofollow" not in html or b"Disallow: /" not in staged["robots.txt"]:
        raise ValueError("release must remain non-indexed until reviewed")
    if "Contact submissions are temporarily unavailable" not in guard:
        raise ValueError("site must disable contact submission")
    if "127.0.0.1:8970" in js or "localhost:8970" in js:
        raise ValueError("stale localhost API reference found")
    if "/assets/index-C6xF2f0w.js" not in html or "/assets/index-CECYfagt.css" not in html:
        raise ValueError("HTML/JS/CSS release manifest mismatch")
    return staged, warnings


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("archive", type=Path)
    p.add_argument("--publish", type=Path, default=Path("apps/fwkf-worldcafe/public"))
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    try:
        with ZipFile(args.archive) as z:
            if z.testzip() is not None:
                raise ValueError("ZIP integrity failure")
            staged, warnings = validate(z)
        data = args.archive.read_bytes()
    except (OSError, BadZipFile, ValueError, UnicodeDecodeError) as exc:
        p.error(str(exc))
    manifest = {
        "zip_sha256": hashlib.sha256(data).hexdigest(),
        "file_count": len(staged),
        "png_count": sum(x.endswith(".png") for x in staged),
        "total_uncompressed_bytes": sum(len(v) for v in staged.values()),
        "staging_only": True,
        "warnings": warnings,
    }
    if not args.dry_run:
        for rel, blob in staged.items():
            dest = args.publish.joinpath(*PurePosixPath(rel).parts)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(blob)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
