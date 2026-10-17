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


def redirected_page(url, expected_target):
    result = subprocess.run(['curl', '--silent', '--show-error', '--max-time', '20', '--output', '/dev/null', '--write-out', '%{http_code}\\n%{redirect_url}', url], capture_output=True, text=True)
    lines = result.stdout.splitlines()
    if result.returncode or len(lines) != 2 or lines[0] != '302' or lines[1] != expected_target:
        raise RuntimeError(f'{url}: expected community redirect missing: {result.stdout!r} {result.stderr.strip()}')
    body = fetch(expected_target)
    if len(body.strip()) < 1000 or '<html' not in body.lower():
        raise RuntimeError(f'{expected_target}: destination content missing')
    return {'url': url, 'status': 'PASS', 'redirect': expected_target, 'scope': 'public landing page; member workflows not exercised'}

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
        lambda: page('https://office.holytemples.org/', 'Global Religious Family Office', True),
        lambda: page('https://leaders.holytemples.org/', 'World Leaders Forum'),
        lambda: page('https://neoteric.holytemples.org/', 'Neoteric Method'),
        lambda: redirected_page('https://society.holytemples.org/', 'https://neo.dnnr.io/'),
        lambda: redirected_page('https://lifestyle.holytemples.org/', 'https://neo.dnnr.io/neo/ambassador-application'),
        adsense,
    ]
    failures = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(lambda check: safe_check(check), checks):
            print(json.dumps(result))
            failures += result['status'] == 'FAIL'
    sys.exit(1 if failures else 0)

