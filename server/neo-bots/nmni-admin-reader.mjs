import { inventoryLinks } from './ces-legacy-crawler.mjs';

const ORIGIN = 'https://www.community-exchange.org';
export const NMNI_TRADING_COLUMNS = Object.freeze(['Months', 'Month-Year', 'Trades', 'NEO', 'Average', 'Levy', 'Total (- Levy)', 'Total']);
const text = html => String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, '\u00a0').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();

export function parseNmniTradingReport(html, observedAt = new Date().toISOString()) {
  const monthlyRows = [];
  let headersVerified = false;
  for (const match of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => text(cell[1]));
    if (JSON.stringify(cells) === JSON.stringify(NMNI_TRADING_COLUMNS)) headersVerified = true;
    if (cells.length === 8 && /^\d+$/.test(cells[0]) && /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/.test(cells[1])) monthlyRows.push(cells);
  }
  if (!headersVerified || !text(html).includes('Trading Statistics') || monthlyRows.length === 0 || monthlyRows.length > 250) throw new Error('CES report could not be verified');
  return { schemaVersion: 'neo.ces.browser-evidence.v1', exchangeId: 'NMNI', observedAt,
    source: { origin: ORIGIN, path: '/_admin/statstrading.asp', method: 'authenticated-server-read' },
    scrapedReport: { columns: [...NMNI_TRADING_COLUMNS], monthlyRows } };
}

export async function readNmniAdminReport({ request, exchange, now = () => new Date().toISOString(), collect = true }) {
  if (exchange?.exchangeId !== 'NMNI' || exchange.adminAccount !== 'NMNI0000') throw new Error('NMNI administrator identity required');
  const member = await request('/memac.asp', { method: 'GET' });
  if (!member.ok) throw new Error('CES member session unavailable');
  const memberHtml = await member.text();
  const adminLink = inventoryLinks(memberHtml, { pageUrl: ORIGIN + '/memac.asp', baseUrl: ORIGIN }).find(link => link.text === 'Administrator Functions');
  if (!adminLink) throw new Error('CES administrator transition unavailable');
  const transition = new URL(adminLink.url.replace(/&amp;/gi, '&'));
  if (transition.origin !== ORIGIN || transition.pathname !== '/rlogin.asp' || transition.searchParams.get('action') !== 'login' || transition.searchParams.get('uid') !== exchange.adminAccount) throw new Error('CES administrator transition rejected');
  // The legacy transition may carry a credential in its query. Keep it in this
  // request only: never return it, log it, or add it to a discovery manifest.
  let response = await request(transition.toString(), { method: 'GET' });
  let currentUrl = transition.toString();
  for (let count = 0; response.status >= 300 && response.status < 400 && count < 3; count++) {
    const target = new URL(response.headers.get('location') || '', currentUrl);
    if (target.origin !== ORIGIN || !target.pathname.startsWith('/_admin/') || target.username || target.password) throw new Error('CES administrator redirect rejected');
    response = await request(target.toString(), { method: 'GET' });
    currentUrl = target.toString();
  }
  if (!response.ok) throw new Error('CES administrator session unavailable');
  const home = text(await response.text());
  if (!home.includes('Administration Index') || !home.includes('Noocratic Open Market Nibiru Index Administration (NMNI)')) throw new Error('CES administrator proof missing');
  const proof = { exchangeId: 'NMNI', memberAuthenticated: true, adminAuthenticated: true, verifiedAt: now() };
  if (!collect) return { proof };
  const report = await request('/_admin/statstrading.asp', { method: 'GET' });
  if (!report.ok) throw new Error('CES report unavailable');
  return { proof, snapshot: parseNmniTradingReport(await report.text(), now()) };
}
