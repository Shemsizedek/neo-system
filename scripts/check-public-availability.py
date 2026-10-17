"""Check real public documents and assets; a 200 blank app is not healthy."""
import concurrent.futures
import json
import re
import subprocess
import sys
from urllib.parse import urljoin, urlsplit

def fetch(url):
    result = subprocess.run(['curl', '--silent', '--show-error', '--location', '--fail-with-body', '--connect-timeout', '8', '--max-time', '25', '--retry', '1', '--retry-delay', '2', '--retry-all-errors', url], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'{url}: {result.stderr.strip()}')
    return result.stdout

def page(url, marker, assets=False):
    body = fetch(url)
    if marker not in body:
        raise RuntimeError(f'{url}: expected page content missing: {marker}')
    if assets:
        references = re.findall(r'(?:src|href)=[\"\']([^\"\']+\.(?:js|css)(?:\?[^\"\']*)?)[\"\']', body)
        same_origin = [urljoin(url, item) for item in references if urlsplit(urljoin(url,item)).netloc == urlsplit(url).netloc]
        if not same_origin:
            raise RuntimeError(f'{url}: no application assets found')
        for asset in same_origin:
            content = fetch(asset)
            if not content.strip() or content.lstrip().lower().startswith('<!doctype html'):
                raise RuntimeError(f'{asset}: missing asset or HTML fallback')
    return {'url': url, 'status': 'PASS'}

def adsense():
    root = fetch('https://holytemples.org/')
    ads = fetch('https://holytemples.org/ads.txt')
    robots = fetch('https://holytemples.org/robots.txt')
    expected = 'google.com, pub-7219200716649339, DIRECT, f08c47fec0942fa0'
    if expected not in [line.strip() for line in ads.splitlines()]:
        raise RuntimeError('ads.txt publisher record missing')
    if 'ca-pub-7219200716649339' not in root or 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js' not in root:
        raise RuntimeError('AdSense publisher script missing')
    if re.search(r'^\s*Disallow:\s*/\s*$', robots, re.M | re.I):
        raise RuntimeError('robots.txt blocks the site root')
    return {'url': 'https://holytemples.org/', 'status': 'PASS', 'check': 'AdSense technical prerequisites; not an approval decision'}

def safe_check(check):
    try:
        return check()
    except Exception as error:
        return {'status': 'FAIL', 'error': str(error)}

if __name__ == '__main__':
    checks = [
        lambda: page('https://holytemples.org/', 'World Temple'),
        lambda: page('https://egov.holytemples.org/', 'Templist Portal', True),
        lambda: page('https://neo.holytemples.org/', 'Welcome to NEO.'),
        lambda: page('https://hub.holytemples.org/', 'NEO'),
        lambda: page('https://neo-portal-recovery.onrender.com/', 'NEO System', True),
        lambda: page('https://city.holytemples.org/', 'City of Nu University', True),
        lambda: page('https://university.holytemples.org/', 'Nu University', True),
        adsense,
    ]
    failures = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(lambda check: safe_check(check), checks):
            print(json.dumps(result))
            failures += result['status'] == 'FAIL'
    sys.exit(1 if failures else 0)

