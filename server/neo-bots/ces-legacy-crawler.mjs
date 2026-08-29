import { inventoryCesForms } from './ces-form-mapper.mjs';

const DEFAULT_SURFACES = Object.freeze([
  { key: 'login', label: 'Legacy Login', path: '/', risk: 'auth' },
  { key: 'transactions', label: 'Transactions', path: null, risk: 'financial-read' },
  { key: 'offerings', label: 'Offerings', path: null, risk: 'financial-read' },
  { key: 'publications', label: 'Publications', path: null, risk: 'content-read' },
  { key: 'memberships', label: 'Memberships', path: null, risk: 'membership-read' },
  { key: 'manage', label: 'Manage', path: null, risk: 'admin-read' },
  { key: 'stats', label: 'Stats', path: null, risk: 'analytics-read' },
  { key: 'virtual-trader', label: 'Virtual Trader', path: '/win/virtual.asp', risk: 'interexchange-read' },
]);

export function createLegacyCesCrawler({
  request,
  baseUrl = 'https://www.community-exchange.org',
  surfaces = DEFAULT_SURFACES,
  maxLinksPerPage = 200,
} = {}) {
  if (typeof request !== 'function') throw new Error('authenticated request function is required');

  async function inspectSurface(surface) {
    if (!surface.path) {
      return {
        key: surface.key,
        label: surface.label,
        risk: surface.risk,
        status: 'route-unknown',
        writable: false,
        discoveryOnly: true,
      };
    }

    const response = await request(surface.path, { method: 'GET' });
    const html = await response.text();
    const finalUrl = response.url || new URL(surface.path, baseUrl).toString();
    const forms = inventoryCesForms(html, { pageUrl: finalUrl });
    const links = inventoryLinks(html, { pageUrl: finalUrl, baseUrl }).slice(0, maxLinksPerPage);

    return {
      key: surface.key,
      label: surface.label,
      risk: surface.risk,
      status: response.ok ? 'mapped' : 'http-error',
      httpStatus: response.status,
      finalUrl,
      title: extractTitle(html),
      markers: deriveMarkers(html, surface.label),
      forms: forms.map((form) => ({
        index: form.index,
        id: form.id,
        name: form.name,
        action: form.action,
        method: form.method,
        readOnly: form.readOnly,
        fingerprint: form.fingerprint,
        fieldNames: form.fields.map((field) => field.name).filter(Boolean),
      })),
      links,
      writable: false,
      discoveryOnly: true,
    };
  }

  async function crawl(exchange) {
    const pages = [];
    for (const surface of surfaces) pages.push(await inspectSurface(surface));
    return {
      schema: 'neo.ces.legacy.discovery.v1',
      generatedAt: new Date().toISOString(),
      exchange: {
        exchangeId: exchange.exchangeId,
        adminAccount: exchange.adminAccount,
        bankAccount: exchange.bankAccount,
      },
      interface: 'legacy',
      readOnly: true,
      pages,
      discoveredLinks: dedupeLinks(pages.flatMap((page) => page.links || [])),
    };
  }

  return { inspectSurface, crawl };
}

export function inventoryLinks(html = '', { pageUrl, baseUrl = 'https://www.community-exchange.org' } = {}) {
  const links = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(String(html)))) {
    const attrs = parseAttributes(match[1]);
    if (!attrs.href) continue;
    let url;
    try { url = new URL(attrs.href, pageUrl || baseUrl); } catch { continue; }
    if (url.origin !== new URL(baseUrl).origin) continue;
    links.push({
      url: url.toString(),
      path: `${url.pathname}${url.search}`,
      text: stripTags(match[2]).replace(/\s+/g, ' ').trim(),
    });
  }
  return dedupeLinks(links);
}

function dedupeLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    if (!link?.url || seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

function extractTitle(html) {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : null;
}

function deriveMarkers(html, label) {
  const text = stripTags(String(html)).replace(/\s+/g, ' ');
  const markers = [];
  if (label && new RegExp(escapeRegExp(label), 'i').test(text)) markers.push(label);
  for (const candidate of ['Community Exchange System','Virtual Trader','Transactions','Offerings','Publications','Memberships','Manage','Stats']) {
    if (new RegExp(escapeRegExp(candidate), 'i').test(text)) markers.push(candidate);
  }
  return [...new Set(markers)];
}

function parseAttributes(source = '') {
  const attrs = {};
  const attrPattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = attrPattern.exec(source))) attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return attrs;
}

function stripTags(source) { return String(source).replace(/<[^>]+>/g, ' '); }
function escapeRegExp(source) { return String(source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
