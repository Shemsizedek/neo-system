#!/usr/bin/env python3
"""ADS-011: read-only live acceptance check; never changes production."""
import re
import sys
import urllib.request

ROOT = "https://holytemples.org"
ARTICLE = ROOT + "/2026/10/18/noocracy-papers-no-40-delegated-mandates-constituent-consent-and-the-authority-to-propose/"
EXPECTED = "google.com, pub-7219200716649339, DIRECT, f08c47fec0942fa0"

def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "NEO-Ads-Readiness/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.status, response.geturl(), response.read().decode("utf-8", "replace")

def main():
    errors = []
    for path in [ROOT, ROOT + "/ads.txt", ARTICLE + "amp/"]:
        try:
            status, resolved, body = fetch(path)
            print(f"{path}: HTTP {status}, resolved={resolved}, bytes={len(body)}")
            if path.endswith("ads.txt") and EXPECTED not in [line.strip() for line in body.splitlines()]:
                errors.append("ads.txt is missing authorized publisher record")
            if path.endswith("amp/"):
                if not re.search(r'<html\b[^>]*(?:\bamp\b|⚡)', body, re.I):
                    errors.append("AMP route did not produce recognized AMP markup")
                if len(re.findall(r'<script[^>]+custom-element=[\x22\x27]amp-auto-ads',body,re.I)) != 1:
                    errors.append("AMP script count must equal 1")
                if len(re.findall(r'<amp-auto-ads\b',body,re.I)) != 1:
                    errors.append("AMP body auto-ads count must equal 1")
                if 'data-ad-client="ca-pub-7219200716649339"' not in body:
                    errors.append("AMP publisher not present")
        except Exception as exc:
            errors.append(f"{path}: fetch failed ({type(exc).__name__})")
    for issue in errors:
        print("FAIL:", issue)
    if errors:
        sys.exit(1)
    print("PASS: Public AMP markup and ads.txt checks. Google approval and actual ad serving require AdSense account review.")

if __name__ == "__main__":
    main()
