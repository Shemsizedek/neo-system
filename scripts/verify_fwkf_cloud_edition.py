#!/usr/bin/env python3
"""Verify the cloud-only, self-contained public World Café site (not historical React parity)."""
from pathlib import Path
import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else "apps/fwkf-worldcafe/public")
pages=("index.html","events.html","conversations.html","cafes.html","forum.html","knowledge.html","investor-relations.html")
for page in pages:
    html=(root/page).read_text(encoding="utf-8")
    assert "Free World Knowledge Foundation" in html, page
    assert "/site.css" in html, page
    assert "<form" not in html.lower(), page
assert (root/"site.css").exists()
print("World Café cloud-only public site files present and contact forms disabled.")
