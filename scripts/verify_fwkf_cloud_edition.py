#!/usr/bin/env python3
"""Cloud-only FWKF web edition check. Distinct from archived React release parity."""
from pathlib import Path
import sys
html = Path(sys.argv[1] if len(sys.argv)>1 else "apps/fwkf-worldcafe/public/index.html").read_text(encoding="utf8")
required = [
 "Free World Knowledge Foundation", "Turning knowledge into freedom.",
 'id="about"', 'id="world-cafe"', 'id="knowledge-hub"',
 'id="academy"', 'id="index"', 'id="research"',
 'id="contact"', 'id="partnerships"', 'id="innovation-lab"',
 'name="robots" content="noindex,nofollow"',
 "Contact submissions are disabled",
 "concepts pending independent review",
]
missing = [x for x in required if x not in html]
assert not missing, "Missing required cloud-preview content: " + repr(missing)
assert 'http://127.0.0.1' not in html and 'localhost:8970' not in html
assert '<form' not in html.lower(), "Do not introduce unsafe contact submissions"
assert 'This is an interim deployment shell' not in html
print("FWKF cloud-only preview: content + safety checks PASS; NOT a source-build parity test")
