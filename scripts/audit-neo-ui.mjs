import { readFile } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { setTimeout as delay } from 'node:timers/promises';

const matrix = JSON.parse(await readFile(new URL('../config/neo-ui-production.json', import.meta.url), 'utf8'));
const timeoutMs = Number(process.env.NEO_UI_AUDIT_TIMEOUT_MS || 12000);
const concurrency = Number(process.env.NEO_UI_AUDIT_CONCURRENCY || 6);

function classifyBody(text = '') {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  return {
    blank: trimmed.length < 80,
    readOnlySplash: /read[- ]?only|observer mode|api only|service online|health.?check/.test(lower) && trimmed.length < 5000,
    html: /<!doctype html|<html[\s>]/i.test(trimmed),
    title: (trimmed.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim()
  };
}

async function resolveHost(host, result) {
  try {
    const records = await lookup(host, { all: true });
    result.dns = records.length > 0;
    result.addresses = records.map(r => r.address);
    return result.dns;
  } catch (error) {
    result.issue = `DNS unresolved: ${error.code || error.message}`;
    return false;
  }
}

async function audit(surface) {
  const result = {
    id: surface.id,
    host: surface.host,
    uiRequired: surface.uiRequired,
    access: surface.access,
    dns: false,
    https: false,
    status: null,
    contentType: null,
    renderedUi: null,
    issue: null
  };

  if (!(await resolveHost(surface.host, result))) return result;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://${surface.host}/`, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'NEO-UI-Auditor/1.0', accept: 'text/html,application/json;q=0.8,*/*;q=0.5' }
    });
    result.https = true;
    result.status = response.status;
    result.finalUrl = response.url;
    result.contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    const body = classifyBody(text);
    result.title = body.title;

    const accessChallenge = [401, 403].includes(response.status) || /cloudflare access|sign in|login|authentication required/i.test(text);
    if (surface.uiRequired) {
      result.renderedUi = accessChallenge || (response.ok && result.contentType.includes('text/html') && body.html && !body.blank && !body.readOnlySplash);
      if (!result.renderedUi) {
        if (!response.ok) result.issue = `HTTP ${response.status}`;
        else if (!result.contentType.includes('text/html')) result.issue = `UI returned ${result.contentType || 'unknown content type'}`;
        else if (body.blank) result.issue = 'Blank/minimal HTML body';
        else if (body.readOnlySplash) result.issue = 'Read-only/service splash detected';
        else result.issue = 'HTML did not qualify as rendered UI';
      }
    } else {
      result.renderedUi = null;
      if (!(response.ok || accessChallenge)) result.issue = `HTTP ${response.status}`;
    }
  } catch (error) {
    result.issue = `HTTPS failed: ${error.name === 'AbortError' ? 'timeout' : error.message}`;
  } finally {
    clearTimeout(timer);
  }
  return result;
}

async function auditRedirect(surface) {
  const result = {
    id: surface.id,
    host: surface.host,
    kind: 'redirect',
    target: surface.target,
    dns: false,
    https: false,
    status: null,
    location: null,
    redirectOk: false,
    issue: null
  };

  if (!(await resolveHost(surface.host, result))) return result;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://${surface.host}/`, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'NEO-UI-Auditor/1.0', accept: 'text/html,*/*;q=0.5' }
    });
    result.https = true;
    result.status = response.status;
    result.location = response.headers.get('location');

    const expected = new URL(surface.target).href;
    if (response.status >= 300 && response.status < 400 && result.location) {
      const actual = new URL(result.location, `https://${surface.host}/`).href;
      result.redirectOk = actual === expected;
    }

    if (!result.redirectOk) {
      result.issue = `Redirect contract failed: HTTP ${response.status}, location=${result.location || 'none'}`;
    }
  } catch (error) {
    result.issue = `HTTPS redirect failed: ${error.name === 'AbortError' ? 'timeout' : error.message}`;
  } finally {
    clearTimeout(timer);
  }
  return result;
}

async function runPool(items, fn = audit) {
  const out = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      out.push(await fn(item));
      await delay(25);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out.sort((a, b) => a.host.localeCompare(b.host));
}

const results = await runPool(matrix.surfaces);
const redirectResults = await runPool(matrix.redirectSurfaces || [], auditRedirect);
const failed = results.filter(r => r.issue);
const redirectFailed = redirectResults.filter(r => r.issue);
const uiFailures = failed.filter(r => r.uiRequired);

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  domainRoot: matrix.domainRoot,
  totals: {
    surfaces: results.length,
    healthy: results.length - failed.length,
    failed: failed.length,
    uiFailures: uiFailures.length,
    redirects: redirectResults.length,
    healthyRedirects: redirectResults.length - redirectFailed.length,
    redirectFailures: redirectFailed.length
  },
  results,
  redirectResults
}, null, 2));

if (failed.length || redirectFailed.length) process.exitCode = 1;
